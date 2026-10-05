import {
  Camera,
  type CameraRef,
  type FilterSpecification,
  type GeoJSONSourceRef,
  Images,
  Map as MapLibreMap,
  type MapRef,
  type VectorSourceRef,
} from "@maplibre/maplibre-react-native";
import { useCallback, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { useTurismoMapPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { getEstablishmentTilesUrl } from "@/features/establishments/data/establishment-tiles";
import {
  initialViewState,
  maxMapZoom,
  type CameraState,
} from "./center-map-camera";
import {
  buildCenterFeatures,
  buildCentersByCode,
  buildLocalFeatures,
  buildLocalRouteFeature,
  buildSelectedFeatures,
} from "./center-map-features";
import { getCenterMapLabelStyles } from "./center-map-label-styles";
import {
  CentersSource,
  EstablishmentsSource,
  LocalPlacesSource,
  LocalRouteSource,
  mapImages,
  SelectionSource,
} from "./center-map-sources";
import type { CenterMapProps } from "./center-map.types";
import { MapAttributionButton } from "./map-attribution-button";
import {
  handleMapFeaturePress,
  readPressFeatures,
  type MapPressSource,
} from "./map-feature-press";
import { MapLoadingOverlay } from "./map-loading-overlay";
import { hasMapLabelGlyphs } from "./map-symbol-layout";
import { useBasemapStyle } from "./use-basemap-style";
import { useDebouncedState } from "./use-debounced-state";
import { useMapCameraFocus } from "./use-map-camera-focus";
import { useMapLifecycle } from "./use-map-lifecycle";
import { useMapViewportPublisher } from "./use-map-viewport-publisher";
import { UserLocationLayers } from "./user-location-layers";

/** Center priorities are recomputed per center: wait for the camera to rest. */
const viewportCenterDebounceMs = 150;

function getEstablishmentFilter(
  establishmentLayer: CenterMapProps["establishmentLayer"],
  selectedFeature: CenterMapProps["selectedFeature"],
) {
  const groupFilter = establishmentLayer.group
    ? ([
        "==",
        ["get", "group"],
        establishmentLayer.group,
      ] satisfies FilterSpecification)
    : undefined;
  const filter: FilterSpecification | undefined =
    selectedFeature?.kind === "establishment"
      ? [
          "all",
          ...(groupFilter ? [groupFilter] : []),
          [
            "!",
            [
              "all",
              ["==", ["get", "name"], selectedFeature.establishment.name],
              [
                "==",
                ["get", "latitude"],
                selectedFeature.establishment.latitude,
              ],
              [
                "==",
                ["get", "longitude"],
                selectedFeature.establishment.longitude,
              ],
            ],
          ],
        ]
      : groupFilter;
  return { filter, groupFilter };
}

export function CenterMap(props: CenterMapProps) {
  const {
    attributionInset,
    centers,
    initialBounds,
    localPlaces,
    localRoute,
    mapStyleOverride,
    onLocalPlacePress,
    onLocalPlacesPress,
    establishmentLayer,
    selectedFeature = null,
    onBearingChange,
    onViewportChange,
    userLocation = null,
  } = props;
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const centersSourceRef = useRef<GeoJSONSourceRef>(null);
  const localSourceRef = useRef<GeoJSONSourceRef>(null);
  const establishmentsSourceRef = useRef<VectorSourceRef>(null);
  const featurePressKeyRef = useRef(0);
  const [viewportCenter, scheduleViewportCenter] = useDebouncedState(
    {
      latitude: initialViewState.center[1],
      longitude: initialViewState.center[0],
    },
    viewportCenterDebounceMs,
  );
  const { scheme } = useTurismoTheme();
  const colors = useTurismoMapPalette();
  const onlineStyle = useBasemapStyle(scheme, mapStyleOverride === undefined);
  const mapStyle = mapStyleOverride ?? onlineStyle;
  const { fontScale } = useWindowDimensions();
  const labels = getCenterMapLabelStyles({
    fontScale,
    hasGlyphs: hasMapLabelGlyphs(mapStyle),
    scheme,
  });
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
  const { beginRegionChange, completeRegionChange } = useMapViewportPublisher({
    isActive,
    mapRef,
    nativeReady,
    onViewportChange,
  });
  const { cancelLocationFocus, deliver, focusCamera, settleCamera } =
    useMapCameraFocus({
      cameraRef,
      featurePressKeyRef,
      isActive,
      mapRef,
      nativeReady,
      props,
    });
  const { filter: establishmentFilter, groupFilter: establishmentGroupFilter } =
    getEstablishmentFilter(establishmentLayer, selectedFeature);
  const centersByCode = useMemo(
    () => buildCentersByCode(centers, selectedFeature),
    [centers, selectedFeature],
  );
  const centerFeatures = useMemo(
    () => buildCenterFeatures(centers, selectedFeature, viewportCenter),
    [centers, selectedFeature, viewportCenter],
  );
  const localFeatures = useMemo(
    () => buildLocalFeatures(localPlaces),
    [localPlaces],
  );
  const selectedFeatures = useMemo(
    () => buildSelectedFeatures(selectedFeature),
    [selectedFeature],
  );
  const localRouteFeature = useMemo(
    () => buildLocalRouteFeature(localRoute),
    [localRoute],
  );
  const startingView = useMemo<CameraState>(
    () =>
      initialBounds
        ? {
            center: [
              (initialBounds[0] + initialBounds[2]) / 2,
              (initialBounds[1] + initialBounds[3]) / 2,
            ],
            zoom: 12,
          }
        : initialViewState,
    [initialBounds],
  );

  const handleSourcePress = useCallback(
    (source: MapPressSource, event: unknown) => {
      if (!isActive()) return;
      const pressKey = ++featurePressKeyRef.current;
      cancelLocationFocus();
      handleMapFeaturePress({
        source,
        features: readPressFeatures(event),
        clusterSource:
          source === "local"
            ? localSourceRef.current
            : source === "centers"
              ? centersSourceRef.current
              : null,
        establishmentsSource: establishmentsSourceRef.current,
        centers,
        centersByCode,
        localPlaces,
        establishmentLayer,
        establishmentGroupFilter,
        isStale: () => !isActive() || featurePressKeyRef.current !== pressKey,
        easeTo: (options) => cameraRef.current?.easeTo(options),
        focusCamera,
        deliverSelections: deliver,
        onLocalPlacePress,
        onLocalPlacesPress,
      });
    },
    [
      cancelLocationFocus,
      centers,
      centersByCode,
      deliver,
      establishmentGroupFilter,
      establishmentLayer,
      focusCamera,
      isActive,
      localPlaces,
      onLocalPlacePress,
      onLocalPlacesPress,
    ],
  );

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
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction)
            featurePressKeyRef.current += 1;
          beginRegionChange();
        }}
        onRegionIsChanging={(event) => {
          onBearingChange?.(event.nativeEvent.bearing);
        }}
        onRegionDidChange={(event) => {
          const { bearing, bounds, center, userInteraction, zoom } =
            event.nativeEvent;
          scheduleViewportCenter({ longitude: center[0], latitude: center[1] });
          completeRegionChange(center, bounds);
          onBearingChange?.(bearing);
          settleCamera({ center, zoom }, userInteraction);
        }}
        onWillStartLoadingMap={markLoading}
        style={styles.map}
        dragPan
        ref={mapRef}
        touchPitch
        touchRotate
      >
        <Camera
          key="tourism-camera"
          initialViewState={startingView}
          maxZoom={maxMapZoom}
          ref={cameraRef}
        />
        <Images key="tourism-pin-images" images={mapImages} />
        {localRoute ? (
          <LocalRouteSource
            key="tourism-offline-route-source"
            colors={colors}
            data={localRouteFeature}
          />
        ) : null}
        {localPlaces !== undefined ? (
          <LocalPlacesSource
            key="tourism-offline-places-source"
            colors={colors}
            data={localFeatures}
            labels={labels}
            onPress={(event) => handleSourcePress("local", event)}
            ref={localSourceRef}
          />
        ) : (
          <EstablishmentsSource
            key="tourism-establishments-source"
            colors={colors}
            filter={establishmentFilter}
            labels={labels}
            onPress={(event) => handleSourcePress("establishments", event)}
            ref={establishmentsSourceRef}
            tiles={establishmentTiles}
            visible={establishmentLayer.visible}
          />
        )}
        <CentersSource
          key="tourism-centers-source"
          colors={colors}
          data={centerFeatures}
          labels={labels}
          onPress={(event) => handleSourcePress("centers", event)}
          ref={centersSourceRef}
        />
        <SelectionSource
          key="tourism-current-selection-source"
          data={selectedFeatures}
          labels={labels}
          onPress={(event) => handleSourcePress("selection", event)}
        />
        <UserLocationLayers
          key="tourism-user-location"
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
