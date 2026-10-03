import {
  Camera,
  type CameraRef,
  type CircleLayerSpecification,
  type FilterSpecification,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
  Layer,
  Map as MapLibreMap,
  type MapRef,
  type PressEventWithFeatures,
  type SymbolLayerSpecification,
  VectorSource,
  type VectorSourceRef,
} from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { tourismSheetOpenRatio } from "@/core/ui/tourism-bottom-sheet";
import { getDistanceMeters, offsetCoordinate } from "@/core/geo/distance";
import { useTurismoMapPalette, useTurismoTheme } from "@/core/ui/theme-context";
import {
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
import { getEstablishmentKey } from "@/features/establishments/domain/establishment";
import { basemapPalettes } from "../data/basemap-palette";
import {
  getCenterHierarchyRank,
  getCenterMapPriority,
  mapPlaceZoom,
} from "../domain/map-place-priority";
import {
  getMapFeatureCoordinate,
  getNearbyMapFeatureSelections,
  nearbyMapFeatureRadiusMeters,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";
import type { CenterMapProps, CenterMapViewport } from "./center-map.types";
import { MapAttributionButton } from "./map-attribution-button";
import { MapLoadingOverlay } from "./map-loading-overlay";
import { isSameMapViewport, parseMapViewport } from "./map-viewport";
import {
  getMapNameLayout,
  hasMapLabelGlyphs,
  mapPinLayout,
} from "./map-symbol-layout";
import { useBasemapStyle } from "./use-basemap-style";
import { useMapLifecycle } from "./use-map-lifecycle";
import { UserLocationLayers } from "./user-location-layers";
import { turismoMapLayerStyle, turismoSpacing } from "@/core/ui/tokens";

type CenterFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Readonly<{
    code: string;
    name: string;
    hierarchyRank: number;
    priority: number;
  }>
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
const dotRadius = 3;
/** Establishment dots grow with the registry count of their cell. */
const establishmentDotRadius = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "count"], 1],
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
  centerClusters: "tourism-center-clusters",
  centerClusterNames: "tourism-center-cluster-names",
  establishmentDots: "tourism-establishment-dots",
  establishmentPins: "tourism-establishment-pins",
} as const;

const mapImages = {
  ...establishmentPinImages,
  "tourism-center-monument-dark": require("../../../../assets/images/tourism-center-monument-dark.png"),
  "tourism-center-monument-light": require("../../../../assets/images/tourism-center-monument-light.png"),
};

const unclusteredFilter = [
  "!",
  ["has", "point_count"],
] satisfies FilterSpecification;
const clusterFilter = ["has", "point_count"] satisfies FilterSpecification;

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
  initialBounds,
  localPlaces,
  localRoute,
  mapStyleOverride,
  onLocalPlacePress,
  onLocalPlacesPress,
  selectionBottomInset,
  focusBounds,
  establishmentLayer,
  focusLocationKey,
  focusCoordinate = null,
  focusCoordinateKey,
  focusSelection = null,
  selectedFeature = null,
  onBearingChange,
  onViewportChange,
  onCenterPress,
  onEstablishmentPress,
  onOverlappingFeaturePress,
  onLocationFocusChange,
  resetNorthKey,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const centersSourceRef = useRef<GeoJSONSourceRef>(null);
  const localSourceRef = useRef<GeoJSONSourceRef>(null);
  const establishmentsSourceRef = useRef<VectorSourceRef>(null);
  const featurePressKeyRef = useRef(0);
  const selectedFeatureRef = useRef(selectedFeature);
  useEffect(() => {
    selectedFeatureRef.current = selectedFeature;
  }, [selectedFeature]);
  const [viewportCenter, setViewportCenter] = useState({
    latitude: initialViewState.center[1],
    longitude: initialViewState.center[0],
  });
  const pendingLocationFocusRef = useRef<PendingLocationFocus | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const fittedInitialBoundsRef = useRef(false);
  const viewportCallbackRef = useRef(onViewportChange);
  const viewportRequestKeyRef = useRef(0);
  const viewportMovingRef = useRef(false);
  const lastViewportRef = useRef<CenterMapViewport | null>(null);
  useEffect(() => {
    viewportCallbackRef.current = onViewportChange;
  }, [onViewportChange]);
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
  const onlineStyle = useBasemapStyle(scheme, mapStyleOverride === undefined);
  const mapStyle = mapStyleOverride ?? onlineStyle;
  const hasGlyphs = hasMapLabelGlyphs(mapStyle);
  const labelPalette = basemapPalettes[scheme];
  const labelPaint = hasGlyphs
    ? {
        "text-color": labelPalette.text,
        "text-halo-color": labelPalette.textHalo,
        "text-halo-width": 1.5,
        "text-halo-blur": 0.5,
      }
    : undefined;
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
  const publishViewport = useCallback(
    (center: unknown, bounds: unknown) => {
      if (!isActive() || !viewportCallbackRef.current) return;
      const viewport = parseMapViewport(center, bounds);
      if (!viewport || isSameMapViewport(lastViewportRef.current, viewport))
        return;
      lastViewportRef.current = viewport;
      viewportCallbackRef.current(viewport);
    },
    [isActive],
  );
  const establishmentVisibility = establishmentLayer.visible
    ? "visible"
    : "none";
  const establishmentGroupFilter = establishmentLayer.group
    ? ([
        "==",
        ["get", "group"],
        establishmentLayer.group,
      ] satisfies FilterSpecification)
    : undefined;
  const establishmentFilter: FilterSpecification | undefined =
    selectedFeature?.kind === "establishment"
      ? [
          "all",
          ...(establishmentGroupFilter ? [establishmentGroupFilter] : []),
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
      : establishmentGroupFilter;
  const centersByCode = useMemo(
    () =>
      new Map(
        [
          ...centers,
          ...(selectedFeature?.kind === "center"
            ? [selectedFeature.center]
            : []),
        ].map((center) => [center.code, center]),
      ),
    [centers, selectedFeature],
  );
  const centerFeatures = useMemo<CenterFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: centers
        .filter(
          (center) =>
            selectedFeature?.kind !== "center" ||
            center.code !== selectedFeature.center.code,
        )
        .map((center) => ({
          type: "Feature",
          id: center.code,
          properties: {
            code: center.code,
            name: center.name,
            hierarchyRank: getCenterHierarchyRank(center),
            priority: getCenterMapPriority(center, viewportCenter),
          },
          geometry: {
            type: "Point",
            coordinates: [center.longitude, center.latitude],
          },
        })),
    }),
    [centers, selectedFeature, viewportCenter],
  );
  const localFeatures = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: (localPlaces ?? []).map((place) => ({
        type: "Feature",
        id: place.key,
        properties: {
          offlineKey: place.key,
          icon: place.icon,
          name: place.name,
        },
        geometry: {
          type: "Point",
          coordinates: [place.longitude, place.latitude],
        },
      })),
    }),
    [localPlaces],
  );
  const selectedFeatures = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: selectedFeature
        ? [
            {
              type: "Feature",
              properties:
                selectedFeature.kind === "center"
                  ? {
                      code: selectedFeature.center.code,
                      name: selectedFeature.center.name,
                      isCenter: true,
                    }
                  : { ...selectedFeature.establishment, isCenter: false },
              geometry: {
                type: "Point",
                coordinates: getMapFeatureCoordinate(selectedFeature),
              },
            },
          ]
        : [],
    }),
    [selectedFeature],
  );
  const localRouteFeature = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.LineString>
  >(
    () => ({
      type: "FeatureCollection",
      features: localRoute
        ? [{ type: "Feature", geometry: localRoute, properties: {} }]
        : [],
    }),
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
  // La ficha se abre enseguida, mientras la cámara se mueve: no se espera a
  // que MapLibre termine el enfoque. El pin queda centrado en la parte visible
  // del mapa, encima de la sheet abierta (padding inferior).
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const centerNameLayout = getMapNameLayout("center", hasGlyphs, fontScale);
  const establishmentNameLayout = getMapNameLayout(
    "establishment",
    hasGlyphs,
    fontScale,
  );
  const selectedNameLayout = getMapNameLayout("selected", hasGlyphs, fontScale);
  const clusterNameLayout: SymbolLayerSpecification["layout"] | undefined =
    hasGlyphs
      ? {
          "text-field": ["to-string", ["get", "point_count_abbreviated"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11 * fontScale,
        }
      : undefined;
  const focusSelections = useCallback(
    (selections: readonly MapFeatureSelection[], target: [number, number]) => {
      deliverSelections(selections, selectionCallbacksRef.current);
      cameraRef.current?.easeTo({
        center: target,
        duration: focusCameraDurationMs,
        easing: "ease",
        padding: {
          bottom: selectionBottomInset ?? windowHeight * tourismSheetOpenRatio,
          left: 0,
          right: 0,
          top: 0,
        },
        zoom: focusZoom,
      });
    },
    [selectionBottomInset, windowHeight],
  );

  const handleFeaturePress = useCallback(
    (
      event: NativeSyntheticEvent<PressEventWithFeatures>,
      clusterSource?: GeoJSONSourceRef | null,
    ) => {
      if (!isActive()) return;
      const pressKey = ++featurePressKeyRef.current;
      pendingLocationFocusRef.current = null;
      onLocationFocusChange?.(false);

      // El evento ya trae los pines bajo el dedo (hitbox): no hace falta una
      // consulta asíncrona al mapa antes de enfocar. Los catastros vienen de
      // las teselas con los datos de su ficha; los lugares relacionados se
      // filtran luego por distancia geográfica.
      const features = Array.isArray(event?.nativeEvent?.features)
        ? event.nativeEvent.features
        : [];
      const cluster = features.find(
        (feature) =>
          typeof feature.properties?.cluster_id === "number" &&
          feature.geometry?.type === "Point",
      );
      if (cluster?.geometry.type === "Point" && clusterSource) {
        const [longitude, latitude] = cluster.geometry.coordinates;
        if (longitude === undefined || latitude === undefined) return;
        const minimumZoom =
          clusterSource === localSourceRef.current
            ? mapPlaceZoom.establishmentIcon
            : mapPlaceZoom.centerIcon;
        const expandCluster = (zoom: number) => {
          if (!isActive() || featurePressKeyRef.current !== pressKey) return;
          cameraRef.current?.easeTo({
            center: [longitude, latitude],
            duration: focusCameraDurationMs,
            padding: noPadding,
            zoom: Math.min(maxZoom, Math.max(minimumZoom, zoom)),
          });
        };
        void clusterSource
          .getClusterExpansionZoom(cluster.properties?.cluster_id)
          .then(expandCluster)
          .catch(() => expandCluster(minimumZoom));
        return;
      }
      const localKeys = [
        ...new Set(
          features.flatMap((feature) =>
            typeof feature.properties?.offlineKey === "string"
              ? [feature.properties.offlineKey]
              : [],
          ),
        ),
      ];
      if (localKeys.length > 1 && onLocalPlacesPress) {
        onLocalPlacesPress(localKeys);
        return;
      }
      const [localKey] = localKeys;
      if (typeof localKey === "string") {
        const place = localPlaces?.find((item) => item.key === localKey);
        if (place) {
          const nearbyKeys = (localPlaces ?? [])
            .filter(
              (item) =>
                getDistanceMeters(place, item) <= nearbyMapFeatureRadiusMeters,
            )
            .map((item) => item.key);
          cameraRef.current?.easeTo({
            center: [place.longitude, place.latitude],
            duration: focusCameraDurationMs,
            padding: noPadding,
            zoom: focusZoom,
          });
          if (nearbyKeys.length > 1 && onLocalPlacesPress)
            onLocalPlacesPress([
              localKey,
              ...nearbyKeys.filter((key) => key !== localKey),
            ]);
          else onLocalPlacePress?.(localKey);
        }
        return;
      }
      const pressed = features.flatMap<MapFeatureSelection>((feature) => {
        const code = feature.properties?.code;
        const center =
          typeof code === "string" ? centersByCode.get(code) : undefined;
        if (center) return [{ kind: "center", center }];
        const establishment = parseEstablishmentTileFeature(feature.properties);
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
          zoom: mapPlaceZoom.establishmentIcon,
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

      // Open immediately, then recover nearby points hidden by native collision.
      // The query only reads loaded MVT tiles and never makes a registry request.
      if (
        !establishmentLayer.visible ||
        localPlaces !== undefined ||
        selections.length !== 1
      )
        return;
      const [longitude, latitude] = getMapFeatureCoordinate(anchor);
      const coordinate = { latitude, longitude };
      const queryFilter: FilterSpecification = [
        "all",
        ...(establishmentGroupFilter ? [establishmentGroupFilter] : []),
        [
          ">=",
          ["get", "latitude"],
          offsetCoordinate(coordinate, nearbyMapFeatureRadiusMeters, 180)
            .latitude,
        ],
        [
          "<=",
          ["get", "latitude"],
          offsetCoordinate(coordinate, nearbyMapFeatureRadiusMeters, 0)
            .latitude,
        ],
        [
          ">=",
          ["get", "longitude"],
          offsetCoordinate(coordinate, nearbyMapFeatureRadiusMeters, 270)
            .longitude,
        ],
        [
          "<=",
          ["get", "longitude"],
          offsetCoordinate(coordinate, nearbyMapFeatureRadiusMeters, 90)
            .longitude,
        ],
      ];
      void establishmentsSourceRef.current
        ?.querySourceFeatures({
          sourceLayer: establishmentTileLayer,
          filter: queryFilter,
        })
        .then((loaded) => {
          if (!isActive() || featurePressKeyRef.current !== pressKey) return;
          const current = selectedFeatureRef.current;
          const stillSelected =
            current?.kind === "center" && anchor.kind === "center"
              ? current.center.code === anchor.center.code
              : current?.kind === "establishment" &&
                anchor.kind === "establishment" &&
                getEstablishmentKey(current.establishment) ===
                  getEstablishmentKey(anchor.establishment);
          if (!stillSelected) return;
          const nearby = getNearbyMapFeatureSelections(anchor, centers, [
            ...pressed.flatMap((selection) =>
              selection.kind === "establishment"
                ? [selection.establishment]
                : [],
            ),
            ...loaded.flatMap((feature) => {
              const establishment = parseEstablishmentTileFeature(
                feature.properties,
              );
              return establishment ? [establishment] : [];
            }),
          ]);
          if (nearby.length > selections.length)
            deliverSelections(nearby, selectionCallbacksRef.current);
        })
        .catch(() => undefined);
    },
    [
      centersByCode,
      centers,
      establishmentLayer,
      establishmentGroupFilter,
      focusSelections,
      isActive,
      localPlaces,
      onLocalPlacePress,
      onLocalPlacesPress,
      onLocationFocusChange,
    ],
  );

  useEffect(() => {
    if (!nativeReady || !initialBounds || fittedInitialBoundsRef.current)
      return;
    fittedInitialBoundsRef.current = true;
    cameraRef.current?.fitBounds(initialBounds, {
      padding: {
        top: turismoSpacing.md,
        bottom: turismoSpacing.md,
        left: turismoSpacing.md,
        right: turismoSpacing.md,
      },
      duration: focusCameraDurationMs,
    });
  }, [initialBounds, nativeReady]);

  useEffect(() => {
    if (!focusSelection || !nativeReady) return;
    featurePressKeyRef.current += 1;
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
    if (
      !nativeReady ||
      !focusCoordinate ||
      focusCoordinateKey === undefined ||
      focusBounds
    ) {
      return;
    }
    cameraRef.current?.easeTo({
      center: [focusCoordinate.longitude, focusCoordinate.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
  }, [focusBounds, focusCoordinate, focusCoordinateKey, nativeReady]);

  useEffect(() => {
    if (!nativeReady || !focusBounds) return;
    cameraRef.current?.fitBounds(focusBounds, {
      padding: {
        top: turismoSpacing.md,
        bottom: turismoSpacing.md,
        left: turismoSpacing.md,
        right: turismoSpacing.md,
      },
      duration: focusCameraDurationMs,
    });
  }, [focusBounds, focusCoordinateKey, nativeReady]);

  const hasViewportListener = onViewportChange !== undefined;
  useEffect(() => {
    if (!nativeReady || !hasViewportListener || viewportMovingRef.current)
      return;
    // One snapshot covers maps that never emit a camera-change event on load.
    // A gesture or newer event invalidates it before the native promise returns.
    const requestKey = ++viewportRequestKeyRef.current;
    const viewStateRequest = mapRef.current?.getViewState();
    if (!viewStateRequest) return;
    void viewStateRequest
      .then(({ center, bounds }) => {
        if (requestKey !== viewportRequestKeyRef.current) return;
        publishViewport(center, bounds);
      })
      .catch(() => undefined);
    return () => {
      viewportRequestKeyRef.current += 1;
    };
  }, [hasViewportListener, nativeReady, publishViewport]);

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
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction)
            featurePressKeyRef.current += 1;
          viewportMovingRef.current = true;
          viewportRequestKeyRef.current += 1;
        }}
        onRegionIsChanging={(event) => {
          onBearingChange?.(event.nativeEvent.bearing);
        }}
        onRegionDidChange={(event) => {
          const { center, userInteraction, zoom } = event.nativeEvent;
          setViewportCenter({ longitude: center[0], latitude: center[1] });
          viewportMovingRef.current = false;
          viewportRequestKeyRef.current += 1;
          publishViewport(center, event.nativeEvent.bounds);
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
          initialViewState={startingView}
          maxZoom={maxZoom}
          ref={cameraRef}
        />
        <Images images={mapImages} />
        {localRoute ? (
          <GeoJSONSource
            data={localRouteFeature}
            id="tourism-offline-route-source"
          >
            <Layer
              id="tourism-offline-route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.primary, "line-width": 5 }}
            />
          </GeoJSONSource>
        ) : null}
        {localPlaces !== undefined ? (
          <GeoJSONSource
            data={localFeatures}
            cluster
            clusterMaxZoom={mapPlaceZoom.establishmentIcon - 1}
            hitbox={featureHitbox}
            id="tourism-offline-places-source"
            onPress={(event) =>
              handleFeaturePress(event, localSourceRef.current)
            }
            ref={localSourceRef}
          >
            <Layer
              id="tourism-offline-place-clusters"
              filter={clusterFilter}
              type="circle"
              paint={{
                "circle-color": colors.primary,
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  13,
                  10,
                  17,
                  50,
                  21,
                ],
                "circle-stroke-color": colors.surface,
                "circle-stroke-width": 1,
              }}
            />
            {clusterNameLayout ? (
              <Layer
                id="tourism-offline-place-cluster-names"
                filter={clusterFilter}
                type="symbol"
                layout={clusterNameLayout}
                paint={{ "text-color": colors.surface }}
              />
            ) : null}
            <Layer
              id="tourism-offline-place-dots"
              type="circle"
              filter={unclusteredFilter}
              maxzoom={mapPlaceZoom.establishmentIcon}
              paint={{
                "circle-color": colors.primary,
                "circle-radius": 5,
                "circle-stroke-color": colors.surface,
                "circle-stroke-width": 1,
              }}
            />
            <Layer
              id="tourism-offline-place-pins"
              type="symbol"
              filter={unclusteredFilter}
              minzoom={mapPlaceZoom.establishmentIcon}
              layout={{
                ...mapPinLayout,
                ...establishmentNameLayout,
                "icon-image": establishmentPinImageExpression,
              }}
              paint={labelPaint}
            />
          </GeoJSONSource>
        ) : (
          <VectorSource
            hitbox={featureHitbox}
            id="tourism-establishments-source"
            maxzoom={establishmentTileMaxZoom}
            onPress={handleFeaturePress}
            ref={establishmentsSourceRef}
            tiles={establishmentTiles}
          >
            <Layer
              filter={establishmentFilter}
              id={layerIds.establishmentPins}
              layout={{
                ...mapPinLayout,
                ...establishmentNameLayout,
                "icon-image": establishmentPinImageExpression,
                visibility: establishmentVisibility,
              }}
              minzoom={mapPlaceZoom.establishmentIcon}
              paint={labelPaint}
              source-layer={establishmentTileLayer}
              type="symbol"
            />
            <Layer
              filter={establishmentFilter}
              id={layerIds.establishmentDots}
              layout={{ visibility: establishmentVisibility }}
              maxzoom={mapPlaceZoom.establishmentIcon}
              paint={{
                "circle-color": establishmentPinColorExpression,
                "circle-opacity": turismoMapLayerStyle.establishmentDotOpacity,
                "circle-radius": establishmentDotRadius,
                "circle-stroke-color": colors.surface,
                "circle-stroke-width": 1,
              }}
              source-layer={establishmentTileLayer}
              type="circle"
            />
          </VectorSource>
        )}
        <GeoJSONSource
          data={centerFeatures}
          cluster
          clusterMaxZoom={mapPlaceZoom.centerIcon - 1}
          hitbox={featureHitbox}
          id="tourism-centers-source"
          onPress={(event) =>
            handleFeaturePress(event, centersSourceRef.current)
          }
          ref={centersSourceRef}
        >
          <Layer
            id={layerIds.centerClusters}
            filter={clusterFilter}
            paint={{
              "circle-color": colors.primary,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                13,
                10,
                17,
                50,
                21,
              ],
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 1,
            }}
            type="circle"
          />
          {clusterNameLayout ? (
            <Layer
              id={layerIds.centerClusterNames}
              filter={clusterFilter}
              layout={clusterNameLayout}
              paint={{ "text-color": colors.surface }}
              type="symbol"
            />
          ) : null}
          <Layer
            id={layerIds.centerDots}
            filter={unclusteredFilter}
            maxzoom={mapPlaceZoom.centerIcon}
            paint={{
              "circle-color": colors.primary,
              "circle-radius": dotRadius,
            }}
            type="circle"
          />
          <Layer
            id={layerIds.centerIcons}
            filter={unclusteredFilter}
            layout={{
              ...mapPinLayout,
              ...centerNameLayout,
              "symbol-sort-key": ["get", "priority"],
              "icon-image":
                scheme === "dark"
                  ? "tourism-center-monument-dark"
                  : "tourism-center-monument-light",
            }}
            minzoom={mapPlaceZoom.centerIcon}
            paint={labelPaint}
            type="symbol"
          />
        </GeoJSONSource>
        <GeoJSONSource
          data={selectedFeatures}
          hitbox={featureHitbox}
          id="tourism-current-selection-source"
          onPress={handleFeaturePress}
        >
          <Layer
            id="tourism-current-selection-pin"
            type="symbol"
            layout={{
              ...mapPinLayout,
              ...selectedNameLayout,
              "icon-allow-overlap": true,
              "icon-image": [
                "case",
                ["get", "isCenter"],
                scheme === "dark"
                  ? "tourism-center-monument-dark"
                  : "tourism-center-monument-light",
                establishmentPinImageExpression,
              ],
            }}
            paint={labelPaint}
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
