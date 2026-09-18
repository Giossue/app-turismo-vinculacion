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
import { type NativeSyntheticEvent, StyleSheet, View } from "react-native";

import { getTurismoColors } from "@/core/ui/tokens";
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
  const fallbackMapStyle = useMemo(
    () => developmentRasterMapStyle(scheme),
    [scheme],
  );
  const styleRequestKey = `${scheme}:${basemapMode}`;
  const [arcgisMapStyleState, setArcgisMapStyleState] = useState<{
    requestKey: string;
    style: StyleSpecification;
  } | null>(null);

  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_ARCGIS_API_KEY?.trim();
    if (!apiKey) return;

    let cancelled = false;

    fetch(arcgisStyleUrl(apiKey, scheme, basemapMode))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`ArcGIS basemap responded with ${response.status}`);
        }
        return normalizeArcgisStyle(await response.json());
      })
      .then((style) => {
        if (!cancelled)
          setArcgisMapStyleState({ requestKey: styleRequestKey, style });
      })
      .catch(() => {
        // El fallback raster mantiene la exploración disponible si la clave
        // expiró, no tiene el privilegio de basemaps o hay una caída de red.
        // El estilo anterior, si existe, se conserva mientras cambia el tema;
        // el fallback se usará hasta que llegue la respuesta nueva.
      });

    return () => {
      cancelled = true;
    };
  }, [basemapMode, scheme, styleRequestKey]);

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

      // Primero enfocamos el mapa; después actualizamos el estado de selección
      // para que la ficha aparezca sobre el punto que acaba de recibir el foco.
      cameraRef.current?.easeTo({
        center: [center.longitude, center.latitude],
        duration: 450,
        zoom: selectedCenterZoom,
      });
      onCenterPress(center);
    },
    [centersByCode, onCenterPress],
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
        mapStyle={mapStyle}
        onRegionDidChange={(event) => {
          const [west, south, east, north] = event.nativeEvent.bounds;
          if (event.nativeEvent.userInteraction)
            onViewportChange({ west, south, east, north });
        }}
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
    </View>
  );
}

const arcgisStylesBaseUrl =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis";

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
    places: "all",
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
function normalizeArcgisStyle(value: unknown): StyleSpecification {
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
    sources: normalizedSources,
  } as unknown as StyleSpecification;
}

// Fallback público sin credenciales para que el desarrollo local continúe
// funcionando mientras se configura la clave restringida de ArcGIS.
function developmentRasterMapStyle(scheme: "light" | "dark") {
  const dark = scheme === "dark";
  const colors = getTurismoColors(scheme);
  return {
    version: 8,
    sources: {
      "arcgis-development": {
        attribution: "Tiles © Esri",
        tileSize: 256,
        tiles: [
          dark
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        ],
        type: "raster",
      },
    },
    layers: [
      {
        id: "background",
        paint: { "background-color": colors.mapBackground },
        type: "background",
      },
      {
        id: "arcgis-development",
        source: "arcgis-development",
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
});
