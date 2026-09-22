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
import { type NativeSyntheticEvent, StyleSheet, View } from "react-native";

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
type PendingMapFeatureSelection = Readonly<{
  selections: readonly MapFeatureSelection[];
  target: [number, number];
}>;
type PendingLocationFocus = Readonly<{
  target: [number, number];
}>;

// Guaranda, until the tourist's position or a selection moves the camera.
const initialCenter: [number, number] = [-79.00098, -1.59263];
const initialZoom = 14;
const maxZoom = 19;
/** Zoom used to focus a selected pin, a search result or the user. */
const focusZoom = 15;
const focusCameraDurationMs = 500;
const resetNorthDurationMs = 240;
/** Below this zoom every pin collapses to a small colored dot. */
const pinMinZoom = 13;
const pinIconSize = 0.42;
const selectedPinIconSize = 0.52;
const dotRadius = 3;
const establishmentDotRadius = 3.5;
const selectedDotRadius = 5;
const featureHitbox = { bottom: 22, left: 22, right: 22, top: 22 };
const cameraTargetTolerance = 0.001;
const cameraZoomTolerance = 0.15;

const layerIds = {
  centerDots: "tourism-center-dots",
  centerIcons: "tourism-center-icons",
  centerSelectedDot: "tourism-center-selected-dot",
  centerSelectedIcon: "tourism-center-selected-icon",
  establishmentDots: "tourism-establishment-dots",
  establishmentPins: "tourism-establishment-pins",
  establishmentSelectedDot: "tourism-establishment-selected-dot",
  establishmentSelectedPin: "tourism-establishment-selected-pin",
} as const;
const pressableLayerIds = Object.values(layerIds);

const mapImages = {
  ...establishmentPinImages,
  "tourism-center-monument-dark": require("../../../../assets/images/tourism-center-monument-dark.png"),
  "tourism-center-monument-light": require("../../../../assets/images/tourism-center-monument-light.png"),
  "tourism-center-monument-selected-dark": require("../../../../assets/images/tourism-center-monument-selected-dark.png"),
  "tourism-center-monument-selected-light": require("../../../../assets/images/tourism-center-monument-selected-light.png"),
};

const pinLayout = {
  "icon-allow-overlap": true,
  "icon-anchor": "bottom",
  "icon-ignore-placement": true,
} as const;

export function CenterMap({
  centers,
  establishments = [],
  focusLocationKey,
  focusCoordinate = null,
  focusCoordinateKey,
  focusSelection = null,
  onAttributionChange,
  onBearingChange,
  onCenterPress,
  onEstablishmentPress,
  onOverlappingFeaturePress,
  onLocationFocusChange,
  onViewportChange,
  resetNorthKey,
  selectedCenterCode = null,
  selectedEstablishmentKey = null,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const pendingMapFeatureSelectionRef =
    useRef<PendingMapFeatureSelection | null>(null);
  const pendingLocationFocusRef = useRef<PendingLocationFocus | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
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

  const handleFeaturePress = useCallback(
    async (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      if (!isActive()) return;
      pendingLocationFocusRef.current = null;
      pendingMapFeatureSelectionRef.current = null;
      onLocationFocusChange?.(false);

      const nativeEvent = event?.nativeEvent;
      if (!nativeEvent?.point) return;
      const [pointX, pointY] = nativeEvent.point;
      const sourceFeatures = Array.isArray(nativeEvent.features)
        ? nativeEvent.features
        : [];
      let renderedFeatures: GeoJSON.Feature[] = [];
      try {
        renderedFeatures =
          (await mapRef.current?.queryRenderedFeatures([pointX, pointY], {
            layers: pressableLayerIds,
          })) ?? [];
      } catch {
        // Mientras el estilo termina de cargar, el evento de la fuente sigue
        // permitiendo abrir el marcador que recibió el toque.
      }
      if (!isActive()) return;

      // La consulta renderizada sirve solo para reconocer el pin ancla. Los
      // lugares relacionados se calculan luego por distancia geográfica, no
      // por el tamaño del hitbox ni por el nivel de zoom actual.
      const features =
        renderedFeatures.length > 0
          ? [...sourceFeatures.slice(0, 1), ...renderedFeatures]
          : sourceFeatures.slice(0, 1);
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
      const target = [...getMapFeatureCoordinate(anchor)] as [number, number];
      // La selección se confirma cuando MapLibre termina el enfoque. Así el
      // zoom siempre sucede antes de abrir la ficha o las opciones cercanas.
      pendingMapFeatureSelectionRef.current = { selections, target };
      cameraRef.current?.easeTo({
        center: target,
        duration: focusCameraDurationMs,
        easing: "ease",
        zoom: focusZoom,
      });
    },
    [
      centersByCode,
      centers,
      establishments,
      establishmentsByFeatureKey,
      isActive,
      onLocationFocusChange,
    ],
  );

  useEffect(() => {
    if (!focusSelection || !nativeReady) return;
    const target = [...getMapFeatureCoordinate(focusSelection)] as [
      number,
      number,
    ];
    pendingMapFeatureSelectionRef.current = {
      selections: [focusSelection],
      target,
    };
    cameraRef.current?.easeTo({
      center: target,
      duration: focusCameraDurationMs,
      easing: "ease",
      zoom: focusZoom,
    });

    return () => {
      if (
        pendingMapFeatureSelectionRef.current?.selections[0] === focusSelection
      ) {
        pendingMapFeatureSelectionRef.current = null;
      }
    };
  }, [focusSelection, nativeReady]);

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

  useEffect(() => {
    onAttributionChange?.(showAttribution);
    return () => onAttributionChange?.(null);
  }, [onAttributionChange, showAttribution]);

  const selectedCode = selectedCenterCode ?? "";
  const selectedFeatureKey = selectedEstablishmentKey ?? "";

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
          const pendingSelection = pendingMapFeatureSelectionRef.current;
          const pendingLocationFocus = pendingLocationFocusRef.current;

          if (!isActive()) return;

          const [west, south, east, north] = bounds;
          onViewportChange({ west, south, east, north });

          const reachedTarget = ([targetLongitude, targetLatitude]: [
            number,
            number,
          ]) => {
            const [longitude, latitude] = center;
            return (
              Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
              Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
              Math.abs(zoom - focusZoom) <= cameraZoomTolerance
            );
          };

          if (
            pendingLocationFocus &&
            !userInteraction &&
            reachedTarget(pendingLocationFocus.target)
          ) {
            pendingLocationFocusRef.current = null;
            onLocationFocusChange?.(true);
          }

          if (
            pendingSelection &&
            !userInteraction &&
            reachedTarget(pendingSelection.target)
          ) {
            pendingMapFeatureSelectionRef.current = null;
            const [selection] = pendingSelection.selections;
            if (pendingSelection.selections.length > 1) {
              onOverlappingFeaturePress(pendingSelection.selections);
            } else if (selection?.kind === "center") {
              onCenterPress(selection.center);
            } else if (selection?.kind === "establishment") {
              onEstablishmentPress(selection.establishment);
            }
          }

          if (userInteraction) {
            // Si el turista retoma el gesto durante el enfoque, cancela la
            // ficha y el enfoque GPS pendientes: la selección ya no representa
            // el centro visible y la cámara tampoco llegó a la ubicación.
            pendingMapFeatureSelectionRef.current = null;
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
          initialViewState={{ center: initialCenter, zoom: initialZoom }}
          maxZoom={maxZoom}
          ref={cameraRef}
        />
        <Images images={mapImages} />
        <GeoJSONSource
          data={centerFeatures}
          hitbox={featureHitbox}
          id="tourism-centers-source"
          onPress={(event) => void handleFeaturePress(event)}
        >
          <Layer
            filter={["!=", ["get", "code"], selectedCode]}
            id={layerIds.centerDots}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": colors.primary,
              "circle-radius": dotRadius,
            }}
            type="circle"
          />
          <Layer
            filter={["==", ["get", "code"], selectedCode]}
            id={layerIds.centerSelectedDot}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": colors.primaryStrong,
              "circle-radius": selectedDotRadius,
            }}
            type="circle"
          />
          <Layer
            filter={["!=", ["get", "code"], selectedCode]}
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
          <Layer
            filter={["==", ["get", "code"], selectedCode]}
            id={layerIds.centerSelectedIcon}
            layout={{
              ...pinLayout,
              "icon-image":
                scheme === "dark"
                  ? "tourism-center-monument-selected-dark"
                  : "tourism-center-monument-selected-light",
              "icon-size": selectedPinIconSize,
            }}
            minzoom={pinMinZoom}
            type="symbol"
          />
        </GeoJSONSource>
        <GeoJSONSource
          data={establishmentFeatures}
          hitbox={featureHitbox}
          id="tourism-establishments-source"
          onPress={(event) => void handleFeaturePress(event)}
        >
          <Layer
            filter={["!=", ["get", "featureKey"], selectedFeatureKey]}
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
            filter={["==", ["get", "featureKey"], selectedFeatureKey]}
            id={layerIds.establishmentSelectedPin}
            layout={{
              ...pinLayout,
              "icon-image": ["get", "iconImage"],
              "icon-size": selectedPinIconSize,
            }}
            minzoom={pinMinZoom}
            type="symbol"
          />
          <Layer
            filter={["!=", ["get", "featureKey"], selectedFeatureKey]}
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
          <Layer
            filter={["==", ["get", "featureKey"], selectedFeatureKey]}
            id={layerIds.establishmentSelectedDot}
            maxzoom={pinMinZoom}
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": selectedDotRadius,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 2,
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
