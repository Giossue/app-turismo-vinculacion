import {
  Camera,
  type CameraRef,
  type CircleLayerSpecification,
  type FilterSpecification,
  GeoJSONSource,
  Images,
  Layer,
  Map as MapLibreMap,
  type MapRef,
  type PressEventWithFeatures,
  VectorSource,
} from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { tourismSheetOpenRatio } from "@/core/ui/tourism-bottom-sheet";
import { useTurismoMapPalette, useTurismoTheme } from "@/core/ui/theme-context";
import {
  establishmentTileDetailZoom,
  establishmentTileLayer,
  establishmentTileMaxZoom,
  getEstablishmentTilesUrl,
  parseEstablishmentTileFeature,
} from "@/features/establishments/data/establishment-tiles";
import {
  establishmentPinColorExpression,
  establishmentPinImageExpression,
  establishmentPinImages,
} from "@/features/establishments/presentation/establishment-pins";
import {
  getMapFeatureCoordinate,
  getNearbyMapFeatureSelections,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";
import type { CenterMapProps } from "./center-map.types";
import { MapAttributionButton } from "./map-attribution-button";
import { MapLoadingOverlay } from "./map-loading-overlay";
import { useBasemapStyle } from "./use-basemap-style";
import { useMapLifecycle } from "./use-map-lifecycle";
import { UserLocationLayers } from "./user-location-layers";

type CenterFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Readonly<{ code: string }>
>;
type PendingLocationFocus = Readonly<{
  target: [number, number];
}>;
type CameraState = Readonly<{ center: [number, number]; zoom: number }>;
type SelectionCallbacks = Pick<
  CenterMapProps,
  "onCenterPress" | "onEstablishmentPress" | "onOverlappingFeaturePress"
>;

// Guaranda, until the tourist's position or a selection moves the camera.
const initialViewState: CameraState = {
  center: [-79.00098, -1.59263],
  zoom: 14,
};
const maxZoom = 19;
/** Zoom used to focus a selected pin, a search result or the user. */
const focusZoom = 15;
const focusCameraDurationMs = 300;
const resetNorthDurationMs = 240;
/** Below this zoom every pin collapses to a small colored dot. */
const pinMinZoom = establishmentTileDetailZoom;
const pinIconSize = 0.42;
const dotRadius = 3;
/** Establishment dots grow with the registry count of their cell. */
const establishmentDotRadius = [
  "interpolate",
  ["linear"],
  ["get", "count"],
  1,
  3.5,
  100,
  9,
] satisfies NonNullable<CircleLayerSpecification["paint"]>["circle-radius"];
const featureHitbox = { bottom: 22, left: 22, right: 22, top: 22 };
const cameraTargetTolerance = 0.001;
const cameraZoomTolerance = 0.15;
/** MapLibre conserva el padding entre movimientos: los demás enfoques lo anulan. */
const noPadding = { bottom: 0, left: 0, right: 0, top: 0 };

const layerIds = {
  centerDots: "tourism-center-dots",
  centerIcons: "tourism-center-icons",
  establishmentDots: "tourism-establishment-dots",
  establishmentPins: "tourism-establishment-pins",
} as const;

const mapImages = {
  ...establishmentPinImages,
  "tourism-center-monument-dark": require("../../../../assets/images/tourism-center-monument-dark.png"),
  "tourism-center-monument-light": require("../../../../assets/images/tourism-center-monument-light.png"),
};

const pinLayout = {
  "icon-allow-overlap": true,
  "icon-anchor": "bottom",
  "icon-ignore-placement": true,
} as const;

/** True when `camera` rests on `target` at the focus zoom. */
function isCameraAtTarget(
  { center: [longitude, latitude], zoom }: CameraState,
  [targetLongitude, targetLatitude]: [number, number],
): boolean {
  return (
    Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
    Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
    Math.abs(zoom - focusZoom) <= cameraZoomTolerance
  );
}

/** Opens the sheet for one selection, or the choices for several. */
function deliverSelections(
  selections: readonly MapFeatureSelection[],
  callbacks: SelectionCallbacks,
): void {
  const [selection] = selections;
  if (selections.length > 1) {
    callbacks.onOverlappingFeaturePress(selections);
  } else if (selection?.kind === "center") {
    callbacks.onCenterPress(selection.center);
  } else if (selection?.kind === "establishment") {
    callbacks.onEstablishmentPress(selection.establishment);
  }
}

export function CenterMap({
  attributionInset,
  centers,
  establishmentLayer,
  focusLocationKey,
  focusCoordinate = null,
  focusCoordinateKey,
  focusSelection = null,
  onBearingChange,
  onCenterPress,
  onEstablishmentPress,
  onOverlappingFeaturePress,
  onLocationFocusChange,
  resetNorthKey,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const pendingLocationFocusRef = useRef<PendingLocationFocus | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const selectionCallbacksRef = useRef<SelectionCallbacks>({
    onCenterPress,
    onEstablishmentPress,
    onOverlappingFeaturePress,
  });
  useEffect(() => {
    selectionCallbacksRef.current = {
      onCenterPress,
      onEstablishmentPress,
      onOverlappingFeaturePress,
    };
  });
  const { scheme } = useTurismoTheme();
  const colors = useTurismoMapPalette();
  const mapStyle = useBasemapStyle(scheme);
  const {
    isActive,
    markFailed,
    markLoading,
    markReady,
    nativeReady,
    showAttribution,
    showLoadingOverlay,
  } = useMapLifecycle(mapRef);
  const establishmentTiles = useMemo(() => [getEstablishmentTilesUrl()], []);
  const establishmentVisibility = establishmentLayer.visible
    ? "visible"
    : "none";
  const establishmentFilter: FilterSpecification | undefined =
    establishmentLayer.group
      ? ["==", ["get", "group"], establishmentLayer.group]
      : undefined;
  const centersByCode = useMemo(
    () => new Map(centers.map((center) => [center.code, center])),
    [centers],
  );
  const centerFeatures = useMemo<CenterFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: centers.map((center) => ({
        type: "Feature",
        id: center.code,
        properties: { code: center.code },
        geometry: {
          type: "Point",
          coordinates: [center.longitude, center.latitude],
        },
      })),
    }),
    [centers],
  );
  // La ficha se abre enseguida, mientras la cámara se mueve: no se espera a
  // que MapLibre termine el enfoque. El pin queda centrado en la parte visible
  // del mapa, encima de la sheet abierta (padding inferior).
  const { height: windowHeight } = useWindowDimensions();
  const focusSelections = useCallback(
    (selections: readonly MapFeatureSelection[], target: [number, number]) => {
      deliverSelections(selections, selectionCallbacksRef.current);
      cameraRef.current?.easeTo({
        center: target,
        duration: focusCameraDurationMs,
        easing: "ease",
        padding: {
          bottom: windowHeight * tourismSheetOpenRatio,
          left: 0,
          right: 0,
          top: 0,
        },
        zoom: focusZoom,
      });
    },
    [windowHeight],
  );

  const handleFeaturePress = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      if (!isActive()) return;
      pendingLocationFocusRef.current = null;
      onLocationFocusChange?.(false);

      // El evento ya trae los pines bajo el dedo (hitbox): no hace falta una
      // consulta asíncrona al mapa antes de enfocar. Los catastros vienen de
      // las teselas con los datos de su ficha; los lugares relacionados se
      // filtran luego por distancia geográfica.
      const features = Array.isArray(event?.nativeEvent?.features)
        ? event.nativeEvent.features
        : [];
      const pressed = features.flatMap<MapFeatureSelection>((feature) => {
        const code = feature.properties?.code;
        const center =
          typeof code === "string" ? centersByCode.get(code) : undefined;
        if (center) return [{ kind: "center", center }];
        const establishment = parseEstablishmentTileFeature(
          feature.properties,
        );
        return establishment ? [{ kind: "establishment", establishment }] : [];
      });
      const [anchor] = pressed;
      if (!anchor) {
        // Un punto agregado del mapa alejado: se acerca hasta ver sus pines.
        const cell = features.find(
          (feature) => feature.geometry?.type === "Point",
        );
        if (cell?.geometry?.type !== "Point") return;
        const [longitude, latitude] = cell.geometry.coordinates;
        if (longitude === undefined || latitude === undefined) return;
        cameraRef.current?.easeTo({
          center: [longitude, latitude],
          duration: focusCameraDurationMs,
          padding: noPadding,
          zoom: establishmentTileDetailZoom + 1,
        });
        return;
      }

      const selections = getNearbyMapFeatureSelections(
        anchor,
        centers,
        pressed.flatMap((selection) =>
          selection.kind === "establishment" ? [selection.establishment] : [],
        ),
      );
      focusSelections(selections, getMapFeatureCoordinate(anchor));
    },
    [
      centersByCode,
      centers,
      focusSelections,
      isActive,
      onLocationFocusChange,
    ],
  );

  useEffect(() => {
    if (!focusSelection || !nativeReady) return;
    focusSelections([focusSelection], getMapFeatureCoordinate(focusSelection));
  }, [focusSelection, focusSelections, nativeReady]);

  useEffect(() => {
    if (!nativeReady || !userLocation || focusLocationKey === undefined) {
      return;
    }
    if (focusedLocationKeyRef.current === focusLocationKey) return;
    focusedLocationKeyRef.current = focusLocationKey;
    pendingLocationFocusRef.current = {
      target: [userLocation.longitude, userLocation.latitude],
    };
    cameraRef.current?.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
  }, [focusLocationKey, nativeReady, userLocation]);

  useEffect(() => {
    if (!nativeReady || !focusCoordinate || focusCoordinateKey === undefined) {
      return;
    }
    cameraRef.current?.easeTo({
      center: [focusCoordinate.longitude, focusCoordinate.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
  }, [focusCoordinate, focusCoordinateKey, nativeReady]);

  useEffect(() => {
    if (!resetNorthKey || !nativeReady) return;
    let cancelled = false;
    const viewStateRequest = mapRef.current?.getViewState();
    if (!viewStateRequest) return;
    void viewStateRequest
      .then(({ center }) => {
        if (cancelled || !isActive()) return;
        cameraRef.current?.easeTo({
          bearing: 0,
          center,
          duration: resetNorthDurationMs,
          easing: "ease",
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isActive, nativeReady, resetNorthKey]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa con atractivos turísticos publicados"
        compass={false}
        attribution={false}
        androidView="texture"
        logo={false}
        mapStyle={mapStyle}
        onDidFailLoadingMap={markFailed}
        onDidFinishLoadingMap={markReady}
        onDidFinishLoadingStyle={markReady}
        onRegionIsChanging={(event) => {
          onBearingChange?.(event.nativeEvent.bearing);
        }}
        onRegionDidChange={(event) => {
          const { center, userInteraction, zoom } = event.nativeEvent;
          onBearingChange?.(event.nativeEvent.bearing);
          const camera: CameraState = { center, zoom };
          const pendingLocationFocus = pendingLocationFocusRef.current;

          if (!isActive()) return;

          if (
            pendingLocationFocus &&
            !userInteraction &&
            isCameraAtTarget(camera, pendingLocationFocus.target)
          ) {
            pendingLocationFocusRef.current = null;
            onLocationFocusChange?.(true);
            return;
          }

          // Cualquier otro movimiento deja de estar centrado en el turista.
          onLocationFocusChange?.(false);
          if (userInteraction) {
            // Si el turista retoma el gesto durante el enfoque GPS, lo cancela:
            // la cámara ya no llegará a su ubicación.
            pendingLocationFocusRef.current = null;
          }
        }}
        onWillStartLoadingMap={markLoading}
        style={styles.map}
        dragPan
        ref={mapRef}
        touchPitch
        touchRotate
      >
        <Camera
          initialViewState={initialViewState}
          maxZoom={maxZoom}
          ref={cameraRef}
        />
        <Images images={mapImages} />
        <GeoJSONSource
          data={centerFeatures}
          hitbox={featureHitbox}
          id="tourism-centers-source"
          onPress={handleFeaturePress}
        >
          <Layer
            id={layerIds.centerDots}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": colors.primary,
              "circle-radius": dotRadius,
            }}
            type="circle"
          />
          <Layer
            id={layerIds.centerIcons}
            layout={{
              ...pinLayout,
              "icon-image":
                scheme === "dark"
                  ? "tourism-center-monument-dark"
                  : "tourism-center-monument-light",
              "icon-size": pinIconSize,
            }}
            minzoom={pinMinZoom}
            type="symbol"
          />
        </GeoJSONSource>
        <VectorSource
          hitbox={featureHitbox}
          id="tourism-establishments-source"
          maxzoom={establishmentTileMaxZoom}
          onPress={handleFeaturePress}
          tiles={establishmentTiles}
        >
          <Layer
            filter={establishmentFilter}
            id={layerIds.establishmentPins}
            layout={{
              ...pinLayout,
              "icon-image": establishmentPinImageExpression,
              "icon-size": pinIconSize,
              visibility: establishmentVisibility,
            }}
            minzoom={pinMinZoom}
            source-layer={establishmentTileLayer}
            type="symbol"
          />
          <Layer
            filter={establishmentFilter}
            id={layerIds.establishmentDots}
            layout={{ visibility: establishmentVisibility }}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": establishmentPinColorExpression,
              "circle-opacity": 0.82,
              "circle-radius": establishmentDotRadius,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 1,
            }}
            source-layer={establishmentTileLayer}
            type="circle"
          />
        </VectorSource>
        <UserLocationLayers
          coordinate={userLocation}
          dotRadius={7}
          haloRadius={17}
          idPrefix="tourism-user-location"
        />
      </MapLibreMap>
      <MapLoadingOverlay visible={showLoadingOverlay} />
      <MapAttributionButton
        bottom={attributionInset?.bottom}
        left={attributionInset?.left}
        onPress={showAttribution}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: { flex: 1 },
});
