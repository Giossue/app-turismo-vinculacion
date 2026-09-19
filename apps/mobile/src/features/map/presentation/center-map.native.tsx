import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
  Layer,
  Map as MapLibreMap,
  type PressEventWithFeatures,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

import {
  getTurismoColors,
  turismoMetrics,
  turismoSpacing,
} from "@/core/ui/tokens";
import { useTurismoTheme } from "@/core/ui/theme-context";
import type { UserLocationCoordinate } from "@/core/location/use-user-location";
import type { PublicCenter } from "@/features/centers/domain/public-center";

type BoundingBox = Readonly<{
  west: number;
  south: number;
  east: number;
  north: number;
}>;
export type BasemapMode = "streets" | "navigation";
type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  basemapMode?: BasemapMode;
  focusLocationKey?: number;
  onCenterPress: (center: PublicCenter) => void;
  onViewportChange: (bounds: BoundingBox) => void;
  selectedCenterCode?: string | null;
  userLocation?: UserLocationCoordinate | null;
}>;
type CenterProperties = Readonly<{ code: string }>;
type CenterFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CenterProperties
>;
type UserLocationFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Record<string, never>
>;

const tourismPinLight = require("../../../../assets/images/tourism-pin-light.png");
const tourismPinDark = require("../../../../assets/images/tourism-pin-dark.png");
const tourismPinSelectedLight = require("../../../../assets/images/tourism-pin-selected-light.png");
const tourismPinSelectedDark = require("../../../../assets/images/tourism-pin-selected-dark.png");

const selectedCenterZoom = 16;
const selectedCenterCameraDuration = 320;
const cameraTargetTolerance = 0.001;
const cameraZoomTolerance = 0.15;
const arcgisStyleCache = new Map<string, StyleSpecification>();
const arcgisStylePromiseCache = new Map<string, Promise<StyleSpecification>>();

type PendingCenterSelection = Readonly<{
  center: PublicCenter;
  target: [number, number];
}>;

export function CenterMap({
  basemapMode = "streets",
  centers,
  focusLocationKey,
  onCenterPress,
  onViewportChange,
  selectedCenterCode = null,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const pendingCenterSelectionRef = useRef<PendingCenterSelection | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const { scheme } = useTurismoTheme();
  const colors = getTurismoColors(scheme);
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
  const userLocationFeatures = useMemo<UserLocationFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: userLocation
        ? [
            {
              type: "Feature",
              id: "tourist-user-location",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [userLocation.longitude, userLocation.latitude],
              },
            },
          ]
        : [],
    }),
    [userLocation],
  );
  // Con pocos puntos mostramos cada pin de forma estable. El clustering nativo
  // se reserva para catálogos grandes, evitando que un zoom corto cambie un
  // pin por un círculo de grupo durante la exploración inicial.
  const shouldCluster = centers.length > 20;
  const fallbackMapStyle = useMemo(() => cleanRasterMapStyle(scheme), [scheme]);
  // Cambiar esta revisión invalida estilos normalizados durante Fast Refresh
  // sin reiniciar la actividad nativa ni conservar colores de una versión
  // anterior en la caché de memoria.
  const styleRequestKey = `quiet-v3:${scheme}:${basemapMode}`;
  const apiKey = process.env.EXPO_PUBLIC_ARCGIS_API_KEY?.trim();
  const [arcgisMapStyleState, setArcgisMapStyleState] = useState<{
    requestKey: string;
    style: StyleSpecification;
  } | null>(() => {
    const cached = arcgisStyleCache.get(styleRequestKey);
    return cached ? { requestKey: styleRequestKey, style: cached } : null;
  });
  const [mapLoadState, setMapLoadState] = useState<
    "loading" | "ready" | "error"
  >(() =>
    !apiKey || arcgisStyleCache.has(styleRequestKey) ? "ready" : "loading",
  );

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;

    getArcgisStyle(apiKey, scheme, basemapMode, styleRequestKey)
      .then((style) => {
        if (!cancelled) {
          setArcgisMapStyleState({ requestKey: styleRequestKey, style });
          setMapLoadState("ready");
        }
      })
      .catch(() => {
        // El fallback raster mantiene la exploración disponible si la clave
        // expiró, no tiene el privilegio de basemaps o hay una caída de red.
        // El estilo anterior, si existe, se conserva mientras cambia el tema;
        // el fallback se usará hasta que llegue la respuesta nueva.
        if (!cancelled) setMapLoadState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, basemapMode, scheme, styleRequestKey]);

  const mapStyle =
    arcgisMapStyleState?.requestKey === styleRequestKey
      ? arcgisMapStyleState.style
      : fallbackMapStyle;
  const handleSourcePress = useCallback(
    async (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const features = event.nativeEvent.features;
      const clusterFeature = features.find(
        (feature) => typeof feature.properties?.cluster_id === "number",
      );
      if (clusterFeature) {
        const clusterId = clusterFeature.properties?.cluster_id;
        if (typeof clusterId !== "number") return;
        const expansionZoom =
          await sourceRef.current?.getClusterExpansionZoom(clusterId);
        if (expansionZoom === undefined) return;
        cameraRef.current?.easeTo({
          center: event.nativeEvent.lngLat,
          duration: 350,
          zoom: expansionZoom,
        });
        return;
      }

      const centerCode = features.find(
        (feature) => typeof feature.properties?.code === "string",
      )?.properties?.code;
      if (typeof centerCode !== "string") return;
      const center = centersByCode.get(centerCode);
      if (!center) return;

      const target: [number, number] = [center.longitude, center.latitude];
      // La selección se confirma cuando MapLibre termina el enfoque. Así el
      // cambio de pin y la apertura del bottom sheet no compiten con la
      // animación de la cámara en el mismo frame.
      pendingCenterSelectionRef.current = { center, target };
      cameraRef.current?.easeTo({
        center: target,
        duration: selectedCenterCameraDuration,
        easing: "ease",
        zoom: selectedCenterZoom,
      });
    },
    [centersByCode],
  );

  useEffect(() => {
    if (!userLocation || focusLocationKey === undefined) return;
    if (focusedLocationKeyRef.current === focusLocationKey) return;
    focusedLocationKeyRef.current = focusLocationKey;
    cameraRef.current?.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      duration: 500,
      zoom: 15,
    });
  }, [focusLocationKey, userLocation]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa con atractivos turísticos publicados"
        compass
        compassPosition={{
          bottom:
            turismoSpacing.md + turismoMetrics.controlMd + turismoSpacing.sm,
          right: turismoSpacing.md,
        }}
        mapStyle={mapStyle}
        onDidFailLoadingMap={() => setMapLoadState("error")}
        onDidFinishLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingStyle={() => setMapLoadState("ready")}
        onRegionDidChange={(event) => {
          const { bounds, center, userInteraction, zoom } = event.nativeEvent;
          const pendingSelection = pendingCenterSelectionRef.current;

          if (pendingSelection && !userInteraction) {
            const [targetLongitude, targetLatitude] = pendingSelection.target;
            const [longitude, latitude] = center;
            const reachedTarget =
              Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
              Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
              Math.abs(zoom - selectedCenterZoom) <= cameraZoomTolerance;

            if (reachedTarget) {
              pendingCenterSelectionRef.current = null;
              onCenterPress(pendingSelection.center);
            }
          }

          if (userInteraction) {
            // Si el turista retoma el gesto durante el enfoque, cancela la
            // ficha pendiente: la selección ya no representa el centro visible.
            pendingCenterSelectionRef.current = null;
            const [west, south, east, north] = bounds;
            onViewportChange({ west, south, east, north });
          }
        }}
        onWillStartLoadingMap={() => setMapLoadState("loading")}
        style={styles.map}
      >
        <Camera
          initialViewState={{ center: [-79.00098, -1.59263], zoom: 14 }}
          maxZoom={19}
          ref={cameraRef}
        />
        <Images
          images={{
            "tourism-pin-dark": tourismPinDark,
            "tourism-pin-light": tourismPinLight,
            "tourism-pin-selected-dark": tourismPinSelectedDark,
            "tourism-pin-selected-light": tourismPinSelectedLight,
          }}
        />
        <GeoJSONSource
          cluster={shouldCluster}
          clusterMaxZoom={16}
          clusterMinPoints={2}
          clusterRadius={48}
          data={centerFeatures}
          hitbox={{ bottom: 22, left: 22, right: 22, top: 22 }}
          id="tourism-centers-source"
          onPress={handleSourcePress}
          ref={sourceRef}
        >
          <Layer
            filter={["has", "point_count"]}
            id="tourism-center-cluster-circles"
            paint={{
              "circle-color": colors.primary,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                18,
                10,
                21,
                30,
                24,
              ],
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 2,
            }}
            type="circle"
          />
          <Layer
            filter={["has", "point_count"]}
            id="tourism-center-cluster-count"
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 13,
            }}
            paint={{ "text-color": colors.onPrimary }}
            type="symbol"
          />
          <Layer
            filter={
              selectedCenterCode
                ? [
                    "all",
                    ["!", ["has", "point_count"]],
                    ["!=", ["get", "code"], selectedCenterCode],
                  ]
                : ["!", ["has", "point_count"]]
            }
            id="tourism-center-icons"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-ignore-placement": true,
              "icon-image":
                scheme === "dark" ? "tourism-pin-dark" : "tourism-pin-light",
              "icon-size": 0.55,
            }}
            type="symbol"
          />
          <Layer
            filter={[
              "all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "code"], selectedCenterCode ?? ""],
            ]}
            id="tourism-center-selected-icon"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-ignore-placement": true,
              "icon-image":
                scheme === "dark"
                  ? "tourism-pin-selected-dark"
                  : "tourism-pin-selected-light",
              "icon-size": 0.6,
            }}
            type="symbol"
          />
        </GeoJSONSource>
        <GeoJSONSource
          data={userLocationFeatures}
          id="tourism-user-location-source"
        >
          <Layer
            id="tourism-user-location-halo"
            paint={{
              "circle-color": colors.infoSoft,
              "circle-radius": 17,
            }}
            type="circle"
          />
          <Layer
            id="tourism-user-location-dot"
            paint={{
              "circle-color": colors.info,
              "circle-radius": 7,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
        </GeoJSONSource>
      </MapLibreMap>
      {mapLoadState === "loading" ? (
        <View
          pointerEvents="none"
          style={[
            styles.mapLoadingOverlay,
            { backgroundColor: colors.mapBackground },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const arcgisStylesBaseUrl =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis";

function getArcgisStyle(
  apiKey: string,
  scheme: "light" | "dark",
  basemapMode: BasemapMode,
  requestKey: string,
): Promise<StyleSpecification> {
  const cached = arcgisStyleCache.get(requestKey);
  if (cached) return Promise.resolve(cached);

  const pending = arcgisStylePromiseCache.get(requestKey);
  if (pending) return pending;

  const request = fetch(arcgisStyleUrl(apiKey, scheme, basemapMode))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`ArcGIS basemap responded with ${response.status}`);
      }
      return normalizeArcgisStyle(await response.json(), scheme);
    })
    .then((style) => {
      arcgisStyleCache.set(requestKey, style);
      return style;
    })
    .finally(() => arcgisStylePromiseCache.delete(requestKey));

  arcgisStylePromiseCache.set(requestKey, request);
  return request;
}

function arcgisStyleUrl(
  apiKey: string,
  scheme: "light" | "dark",
  basemapMode: BasemapMode,
) {
  const styleName =
    basemapMode === "navigation"
      ? scheme === "dark"
        ? "navigation-night"
        : "navigation"
      : scheme === "dark"
        ? "streets-night"
        : "streets";
  const query = new URLSearchParams({
    echoToken: "true",
    language: "es",
    // Los atractivos propios de Turismo Vinculación son la capa principal;
    // ocultar los POI del proveedor deja el mapa más limpio y legible.
    places: "none",
    token: apiKey,
  });
  return `${arcgisStylesBaseUrl}/${styleName}?${query.toString()}`;
}

/**
 * ArcGIS returns a valid Mapbox style with both `url` (TileJSON) and `tiles`
 * in its vector source. MapLibre Native resolves `url` first and then rejects
 * ArcGIS' service metadata because it does not expose a Mapbox `tiles` field.
 * Keeping the explicit tile template makes the same style portable to native.
 */
function normalizeArcgisStyle(
  value: unknown,
  scheme: "light" | "dark",
): StyleSpecification {
  if (!value || typeof value !== "object") {
    throw new Error("ArcGIS returned an invalid basemap style");
  }

  const style = value as Record<string, unknown>;
  const sources = style.sources;
  if (!sources || typeof sources !== "object") {
    throw new Error("ArcGIS basemap style has no sources");
  }

  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => {
      if (!source || typeof source !== "object") return [sourceId, source];
      const normalizedSource = { ...(source as Record<string, unknown>) };
      if (normalizedSource.tiles && normalizedSource.url) {
        delete normalizedSource.url;
      }
      return [sourceId, normalizedSource];
    }),
  );

  return {
    ...style,
    layers: quietMapLayers(style.layers, scheme),
    sources: normalizedSources,
  } as unknown as StyleSpecification;
}

function quietMapLayers(value: unknown, scheme: "light" | "dark"): unknown {
  if (!Array.isArray(value)) return value;

  const dark = scheme === "dark";
  const roadColor = dark ? "#596675" : "#a8b1ba";
  const neutralLineColor = dark ? "#43515e" : "#d9dee3";

  return value.map((layer) => {
    if (!layer || typeof layer !== "object") return layer;

    const candidate = layer as Record<string, unknown>;
    const layerName = [candidate.id, candidate["source-layer"]]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .toLowerCase();

    if (candidate.type === "background" && !dark) {
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          "background-color": "#ffffff",
        },
      };
    }

    if (candidate.type === "symbol" && !dark) {
      const paint = isRecord(candidate.paint) ? candidate.paint : {};
      return {
        ...candidate,
        paint: {
          ...paint,
          ...(paint["text-color"]
            ? {
                "text-color": "#5b6570",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1,
              }
            : {}),
        },
      };
    }

    if (candidate.type !== "line") return layer;

    const isRoadLayer =
      /road|street|highway|motorway|trunk|arterial|expressway|transportation/.test(
        layerName,
      );
    if (!isRoadLayer) return layer;

    const isRoadBorder = /casing|outline|border|stroke|halo|shadow/.test(
      layerName,
    );
    if (isRoadBorder) {
      return {
        ...candidate,
        layout: {
          ...(isRecord(candidate.layout) ? candidate.layout : {}),
          visibility: "none",
        },
      };
    }

    return {
      ...candidate,
      paint: {
        ...(isRecord(candidate.paint) ? candidate.paint : {}),
        "line-color": isRoadLayer ? roadColor : neutralLineColor,
        "line-opacity": isRoadLayer ? (dark ? 0.42 : 0.5) : 0.24,
      },
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Fallback público sin credenciales para que el desarrollo local continúe
// funcionando mientras se configura la clave restringida de ArcGIS. La base
// Canvas gris se usa como textura muy tenue en claro (sobre fondo blanco) y
// con más presencia en oscuro; la referencia separada conserva las calles y
// etiquetas importantes para explorar.
function cleanRasterMapStyle(scheme: "light" | "dark") {
  const dark = scheme === "dark";
  const colors = getTurismoColors(scheme);
  const baseTiles = dark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  const referenceTiles = dark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
  const attribution =
    "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community";

  return {
    version: 8,
    sources: {
      "tourism-clean-base": {
        attribution,
        tileSize: 256,
        tiles: [baseTiles],
        type: "raster",
      },
      "tourism-clean-reference": {
        attribution,
        tileSize: 256,
        tiles: [referenceTiles],
        type: "raster",
      },
    },
    layers: [
      {
        id: "background",
        paint: {
          "background-color": dark ? colors.mapBackground : "#ffffff",
        },
        type: "background",
      },
      {
        id: "tourism-clean-base",
        source: "tourism-clean-base",
        paint: {
          "raster-opacity": dark ? 0.94 : 0.18,
          "raster-saturation": dark ? -0.25 : -1,
        },
        type: "raster",
      },
      {
        id: "tourism-clean-reference",
        source: "tourism-clean-reference",
        paint: {
          "raster-opacity": dark ? 0.54 : 0.45,
          "raster-saturation": -0.75,
        },
        type: "raster",
      },
    ],
  } as never;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: { flex: 1 },
  mapLoadingOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    opacity: 0.86,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
