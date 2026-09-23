import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Images,
  Layer,
  Map as MapLibreMap,
  type MapRef,
  type PressEventWithFeatures,
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
import { getEstablishmentKey } from "@/features/establishments/domain/establishment";
import {
  establishmentPinImages,
  getEstablishmentPin,
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
type EstablishmentFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Readonly<{ color: string; featureKey: string; iconImage: string }>
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
const pinMinZoom = 13;
const pinIconSize = 0.42;
const dotRadius = 3;
const establishmentDotRadius = 3.5;
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
  establishments = [],
  focusLocationKey,
  focusCoordinate = null,
  focusCoordinateKey,
  focusSelection = null,
  onBearingChange,
  onCenterPress,
  onEstablishmentPress,
  onOverlappingFeaturePress,
  onLocationFocusChange,
  onViewportChange,
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
  // A escala amplia cada registro conserva su identidad cromática en un punto
  // pequeño. Los pines completos aparecen al acercarse, sin convertir varios
  // catastros de colores distintos en un único círculo de grupo.
  const establishmentFeatures = useMemo<EstablishmentFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: establishments.map((establishment) => {
        const featureKey = getEstablishmentKey(establishment);
        const pin = getEstablishmentPin(establishment.icon);
        return {
          type: "Feature",
          id: featureKey,
          properties: {
            color: pin.color,
            featureKey,
            iconImage: pin.imageName,
          },
          geometry: {
            type: "Point",
            coordinates: [establishment.longitude, establishment.latitude],
          },
        };
      }),
    }),
    [establishments],
  );
  const establishmentsByFeatureKey = useMemo(
    () =>
      new Map(
        establishments.map((establishment) => [
          getEstablishmentKey(establishment),
          establishment,
        ]),
      ),
    [establishments],
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

      // El evento de la fuente ya trae el pin tocado: no hace falta una
      // consulta asíncrona al mapa (queryRenderedFeatures) antes de enfocar.
      // Los lugares relacionados se calculan luego por distancia geográfica,
      // no por el tamaño del hitbox ni por el nivel de zoom actual.
      const features = Array.isArray(event?.nativeEvent?.features)
        ? event.nativeEvent.features
        : [];
      const anchor = features.reduce<MapFeatureSelection | null>(
        (selection, feature) => {
          if (selection) return selection;
          const code = feature.properties?.code;
          if (typeof code === "string") {
            const center = centersByCode.get(code);
            if (center) return { kind: "center", center };
          }
          const featureKey = feature.properties?.featureKey;
          if (typeof featureKey === "string") {
            const establishment = establishmentsByFeatureKey.get(featureKey);
            if (establishment) return { kind: "establishment", establishment };
          }
          return null;
        },
        null,
      );
      if (!anchor) return;

      const selections = getNearbyMapFeatureSelections(
        anchor,
        centers,
        establishments,
      );
      focusSelections(selections, getMapFeatureCoordinate(anchor));
    },
    [
      centersByCode,
      centers,
      establishments,
      establishmentsByFeatureKey,
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
          const { bounds, center, userInteraction, zoom } = event.nativeEvent;
          onBearingChange?.(event.nativeEvent.bearing);
          const camera: CameraState = { center, zoom };
          const pendingLocationFocus = pendingLocationFocusRef.current;

          if (!isActive()) return;

          const [west, south, east, north] = bounds;
          onViewportChange({ west, south, east, north });

          if (
            pendingLocationFocus &&
            !userInteraction &&
            isCameraAtTarget(camera, pendingLocationFocus.target)
          ) {
            pendingLocationFocusRef.current = null;
            onLocationFocusChange?.(true);
          }

          if (userInteraction) {
            // Si el turista retoma el gesto durante el enfoque GPS, lo cancela:
            // la cámara ya no llegará a su ubicación.
            pendingLocationFocusRef.current = null;
            onLocationFocusChange?.(false);
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
        <GeoJSONSource
          data={establishmentFeatures}
          hitbox={featureHitbox}
          id="tourism-establishments-source"
          onPress={handleFeaturePress}
        >
          <Layer
            id={layerIds.establishmentPins}
            layout={{
              ...pinLayout,
              "icon-image": ["get", "iconImage"],
              "icon-size": pinIconSize,
            }}
            minzoom={pinMinZoom}
            type="symbol"
          />
          <Layer
            id={layerIds.establishmentDots}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": ["get", "color"],
              "circle-opacity": 0.82,
              "circle-radius": establishmentDotRadius,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 1,
            }}
            type="circle"
          />
        </GeoJSONSource>
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
