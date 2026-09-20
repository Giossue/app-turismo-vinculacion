import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
  Layer,
  Map as MapLibreMap,
  type MapRef,
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

import { getTurismoMapColors } from "@/core/ui/tokens";
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
  onAttributionChange?: (handler: (() => void) | null) => void;
  onBearingChange?: (bearing: number) => void;
  onCenterPress: (center: PublicCenter) => void;
  onViewportChange: (bounds: BoundingBox) => void;
  resetNorthKey?: number;
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
const selfHostedStyleCache = new Map<string, StyleSpecification>();
const selfHostedStylePromiseCache = new Map<
  string,
  Promise<StyleSpecification>
>();

type PendingCenterSelection = Readonly<{
  center: PublicCenter;
  target: [number, number];
}>;

export function CenterMap({
  basemapMode = "streets",
  centers,
  focusLocationKey,
  onAttributionChange,
  onBearingChange,
  onCenterPress,
  onViewportChange,
  resetNorthKey,
  selectedCenterCode = null,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const pendingCenterSelectionRef = useRef<PendingCenterSelection | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const { scheme } = useTurismoTheme();
  const colors = getTurismoMapColors(scheme);
  const showAttribution = useCallback(() => {
    void mapRef.current?.showAttribution();
  }, []);
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
  const fallbackMapStyle = useMemo(
    () => cleanFallbackMapStyle(scheme),
    [scheme],
  );
  // Cambiar esta revisión invalida estilos normalizados durante Fast Refresh
  // sin reiniciar la actividad nativa ni conservar colores de una versión
  // anterior en la caché de memoria.
  const styleRequestKey = `self-hosted-v1:${scheme}:${basemapMode}`;
  const [selfHostedMapStyleState, setSelfHostedMapStyleState] = useState<{
    requestKey: string;
    style: StyleSpecification;
  } | null>(() => {
    const cached = selfHostedStyleCache.get(styleRequestKey);
    return cached ? { requestKey: styleRequestKey, style: cached } : null;
  });
  const [mapLoadState, setMapLoadState] = useState<
    "loading" | "ready" | "error"
  >(() => (selfHostedStyleCache.has(styleRequestKey) ? "ready" : "loading"));

  useEffect(() => {
    let cancelled = false;

    getSelfHostedStyle(scheme, styleRequestKey)
      .then((style) => {
        if (!cancelled) {
          setSelfHostedMapStyleState({ requestKey: styleRequestKey, style });
          setMapLoadState("ready");
        }
      })
      .catch(() => {
        // El estilo vacío conserva la exploración y los pines si el servidor
        // propio está temporalmente fuera de línea.
        if (!cancelled) setMapLoadState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [basemapMode, scheme, styleRequestKey]);

  const mapStyle =
    selfHostedMapStyleState?.requestKey === styleRequestKey
      ? selfHostedMapStyleState.style
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

  useEffect(() => {
    if (!resetNorthKey) return;
    let cancelled = false;
    void mapRef.current?.getViewState().then(({ center }) => {
      if (cancelled) return;
      cameraRef.current?.easeTo({
        bearing: 0,
        center,
        duration: 240,
        easing: "ease",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resetNorthKey]);

  useEffect(() => {
    onAttributionChange?.(showAttribution);
    return () => onAttributionChange?.(null);
  }, [onAttributionChange, showAttribution]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa con atractivos turísticos publicados"
        compass={false}
        attribution={false}
        androidView="texture"
        logo={false}
        mapStyle={mapStyle}
        onDidFailLoadingMap={() => setMapLoadState("error")}
        onDidFinishLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingStyle={() => setMapLoadState("ready")}
        onRegionIsChanging={(event) => {
          onBearingChange?.(event.nativeEvent.bearing);
        }}
        onRegionDidChange={(event) => {
          const { bounds, center, userInteraction, zoom } = event.nativeEvent;
          onBearingChange?.(event.nativeEvent.bearing);
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
        dragPan
        ref={mapRef}
        touchPitch
        touchRotate
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
              "circle-color": colors.locationSoft,
              "circle-radius": 17,
            }}
            type="circle"
          />
          <Layer
            id="tourism-user-location-dot"
            paint={{
              "circle-color": colors.location,
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
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const selfHostedStyleUrlFromEnv =
  process.env.EXPO_PUBLIC_TILESERVER_STYLE_URL?.trim();

function getSelfHostedStyle(
  scheme: "light" | "dark",
  requestKey: string,
): Promise<StyleSpecification> {
  const cached = selfHostedStyleCache.get(requestKey);
  if (cached) return Promise.resolve(cached);

  const pending = selfHostedStylePromiseCache.get(requestKey);
  if (pending) return pending;

  const styleUrl = selfHostedStyleUrl();
  if (!styleUrl) {
    return Promise.reject(
      new Error("EXPO_PUBLIC_TILESERVER_STYLE_URL no está configurada"),
    );
  }

  const request = fetch(styleUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Self-hosted basemap responded with ${response.status}`,
        );
      }
      return normalizeSelfHostedStyle(await response.json(), scheme, styleUrl);
    })
    .then((style) => {
      selfHostedStyleCache.set(requestKey, style);
      return style;
    })
    .finally(() => selfHostedStylePromiseCache.delete(requestKey));

  selfHostedStylePromiseCache.set(requestKey, request);
  return request;
}

function selfHostedStyleUrl(): string | undefined {
  return selfHostedStyleUrlFromEnv;
}

export function loadSelfHostedMapStyle(
  scheme: "light" | "dark",
  basemapMode: BasemapMode = "navigation",
): Promise<StyleSpecification> {
  return getSelfHostedStyle(scheme, `self-hosted-v1:${scheme}:${basemapMode}`);
}

export function getFallbackMapStyle(
  scheme: "light" | "dark",
): StyleSpecification {
  return cleanFallbackMapStyle(scheme);
}

function normalizeSelfHostedStyle(
  value: unknown,
  scheme: "light" | "dark",
  styleUrl: string,
): StyleSpecification {
  if (!value || typeof value !== "object") {
    throw new Error("The self-hosted basemap returned an invalid style");
  }

  const style = value as Record<string, unknown>;
  const sources = style.sources;
  if (!sources || typeof sources !== "object") {
    throw new Error("The self-hosted basemap style has no sources");
  }

  const tileJsonUrl = new URL("/data/v3.json", styleUrl).toString();
  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => {
      if (!source || typeof source !== "object") return [sourceId, source];
      const normalizedSource = { ...(source as Record<string, unknown>) };
      const sourceUrl =
        typeof normalizedSource.url === "string"
          ? new URL(normalizedSource.url, styleUrl).toString()
          : undefined;
      if (sourceUrl === tileJsonUrl) {
        // Conservar el TileJSON permite que MapLibre resuelva el template de
        // tiles y sus metadatos exactamente como los publica TileServer GL.
        // Ecuador se generó hasta z14; se declara para evitar solicitudes
        // innecesarias a niveles superiores.
        normalizedSource.url = sourceUrl;
        normalizedSource.maxzoom = 14;
        delete normalizedSource.tiles;
      }
      if (sourceId === "openmaptiles") {
        normalizedSource.attribution =
          "© OpenMapTiles © OpenStreetMap contributors";
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
  const palette = dark
    ? {
        background: "#292a28",
        building: "#454947",
        farmland: "#454a3d",
        fillDefault: "#303331",
        grass: "#374d3b",
        ice: "#4a4c4a",
        landuse: "#3a3c38",
        neutralLine: "#4b504f",
        park: "#3d5941",
        roadMajor: "#7b8585",
        roadMinor: "#626b6c",
        roadArea: "#3c3f3c",
        sand: "#554b3f",
        text: "#d3d7d5",
        textHalo: "#292a28",
        water: "#315565",
        waterLine: "#4c7887",
        wood: "#304a35",
      }
    : {
        background: "#f4ece1",
        building: "#e1dfdc",
        farmland: "#dcebd8",
        fillDefault: "#f4f0e9",
        grass: "#d6ebcf",
        ice: "#f8f7f3",
        landuse: "#eee8dd",
        neutralLine: "#d4d5d1",
        park: "#cce7c9",
        roadMajor: "#a9aba8",
        roadMinor: "#c1c3bf",
        roadArea: "#eee9df",
        sand: "#eddfc9",
        text: "#565254",
        textHalo: "#fffdf9",
        water: "#bfe1ed",
        waterLine: "#78b8d0",
        wood: "#c4dfbf",
      };
  const backgroundColor = palette.background;

  return value.map((layer) => {
    if (!layer || typeof layer !== "object") return layer;

    const candidate = layer as Record<string, unknown>;
    const layerName = [candidate.id, candidate["source-layer"]]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .toLowerCase();

    if (candidate.type === "background") {
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          "background-color": backgroundColor,
        },
      };
    }

    if (candidate.type === "fill" || candidate.type === "fill-extrusion") {
      const isWaterLayer = /water|ocean|sea|river|lake/.test(layerName);
      const isBuildingLayer = /building|structure|footprint|house/.test(
        layerName,
      );
      const isWoodLayer = /wood|forest/.test(layerName);
      const isParkLayer = /park|golf/.test(layerName);
      const isGrassLayer = /grass|vegetation|scrub|meadow|wetland/.test(
        layerName,
      );
      const isFarmlandLayer = /farm|crop/.test(layerName);
      const isSandLayer = /sand|bare|earth|rangeland|desert/.test(layerName);
      const isIceLayer = /ice|glacier/.test(layerName);
      const isResidentialLayer = /residential|urban|commercial|industrial/.test(
        layerName,
      );
      const isRoadAreaLayer = /road|pier/.test(layerName);
      const isAerowayLayer = /aeroway/.test(layerName);

      // Paleta propia inspirada en Alidade Bright y Alidade Smooth Dark:
      // conserva variedad semántica sin recuperar el amarillo dominante ni
      // hacer que las calles compitan con los atractivos.
      const fillColor = dark
        ? isBuildingLayer
          ? palette.building
          : isWaterLayer
            ? palette.water
            : isWoodLayer
              ? palette.wood
              : isParkLayer
                ? palette.park
                : isGrassLayer
                  ? palette.grass
                  : isFarmlandLayer
                    ? palette.farmland
                    : isSandLayer
                      ? palette.sand
                      : isIceLayer
                        ? palette.ice
                        : isResidentialLayer
                          ? palette.fillDefault
                          : isRoadAreaLayer
                            ? palette.roadArea
                            : isAerowayLayer
                              ? palette.roadArea
                              : palette.landuse
        : isBuildingLayer
          ? palette.building
          : isWaterLayer
            ? palette.water
            : isWoodLayer
              ? palette.wood
              : isParkLayer
                ? palette.park
                : isGrassLayer
                  ? palette.grass
                  : isFarmlandLayer
                    ? palette.farmland
                    : isSandLayer
                      ? palette.sand
                      : isIceLayer
                        ? palette.ice
                        : isResidentialLayer
                          ? "#fffdfa"
                          : isRoadAreaLayer
                            ? palette.roadArea
                            : isAerowayLayer
                              ? "#f0eee9"
                              : palette.landuse;
      const fillOpacity = isBuildingLayer
        ? dark
          ? 0.86
          : 0.9
        : isWaterLayer || isWoodLayer || isParkLayer || isGrassLayer
          ? dark
            ? 0.88
            : 0.82
          : dark
            ? 0.86
            : 0.78;
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          ...(candidate.type === "fill"
            ? {
                "fill-color": fillColor,
                "fill-opacity": fillOpacity,
                "fill-outline-color": "rgba(0, 0, 0, 0)",
              }
            : {
                "fill-extrusion-color": fillColor,
                "fill-extrusion-opacity": isBuildingLayer ? 0.78 : 0.9,
              }),
        },
      };
    }

    if (candidate.type === "symbol") {
      const paint = isRecord(candidate.paint) ? candidate.paint : {};
      return {
        ...candidate,
        paint: {
          ...paint,
          ...(paint["text-color"]
            ? {
                "text-color": palette.text,
                "text-halo-color": palette.textHalo,
                "text-halo-width": 1,
              }
            : {}),
        },
      };
    }

    if (candidate.type !== "line") return layer;

    const isWaterwayLayer = /waterway/.test(layerName);
    if (isWaterwayLayer) {
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          "line-color": palette.waterLine,
          "line-opacity": dark ? 0.7 : 0.82,
        },
      };
    }

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
        "line-color": /trunk|primary|major|motorway/.test(layerName)
          ? palette.roadMajor
          : palette.roadMinor,
        "line-opacity": /trunk|primary|major|motorway/.test(layerName)
          ? dark
            ? 0.84
            : 0.88
          : dark
            ? 0.68
            : 0.74,
      },
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Si el servidor propio no responde, conservamos los pines y controles sobre
// un fondo local neutro; no se consulta otro proveedor de mapas.
function cleanFallbackMapStyle(scheme: "light" | "dark") {
  const dark = scheme === "dark";
  const colors = getTurismoMapColors(scheme);

  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        paint: {
          "background-color": dark ? colors.background : "#f5f7f8",
        },
        type: "background",
      },
    ],
  } as unknown as StyleSpecification;
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
