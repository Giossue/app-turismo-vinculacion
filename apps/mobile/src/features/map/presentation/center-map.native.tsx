import {
  Camera,
  Map as MapLibreMap,
  Marker,
} from "@maplibre/maplibre-react-native";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { TurismoIcon } from "@/core/ui/turismo-icons";
import { getTurismoColors } from "@/core/ui/tokens";
import type { PublicCenter } from "@/features/centers/domain/public-center";

type BoundingBox = Readonly<{
  west: number;
  south: number;
  east: number;
  north: number;
}>;
type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  onCenterPress: (center: PublicCenter) => void;
  onViewportChange: (bounds: BoundingBox) => void;
}>;
type MarkerGroup = Readonly<{
  longitude: number;
  latitude: number;
  centers: readonly PublicCenter[];
}>;

export function CenterMap({
  centers,
  onCenterPress,
  onViewportChange,
}: CenterMapProps) {
  const [zoom, setZoom] = useState(11);
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const colors = getTurismoColors(scheme);
  const groups = useMemo(() => clusterCenters(centers, zoom), [centers, zoom]);
  const mapStyle = useMemo(() => developmentMapStyle(scheme), [scheme]);
  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa con atractivos turísticos publicados"
        mapStyle={mapStyle}
        onRegionDidChange={(event) => {
          const [west, south, east, north] = event.nativeEvent.bounds;
          setZoom(event.nativeEvent.zoom);
          if (event.nativeEvent.userInteraction)
            onViewportChange({ west, south, east, north });
        }}
        style={{ flex: 1 }}
      >
        <Camera
          initialViewState={{ center: [-79.00098, -1.59263], zoom: 14 }}
        />
        {groups.map((group) => (
          <Marker
            id={group.centers.map((center) => center.code).join("-")}
            key={group.centers.map((center) => center.code).join("-")}
            lngLat={[group.longitude, group.latitude]}
          >
            <Pressable
              accessibilityLabel={
                group.centers.length === 1
                  ? `Abrir información de ${group.centers[0]!.name}`
                  : `${group.centers.length} atractivos agrupados`
              }
              onPress={() =>
                group.centers.length === 1 && onCenterPress(group.centers[0]!)
              }
              style={styles.markerPressable}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.surface,
                  },
                ]}
              >
                {group.centers.length === 1 ? (
                  <TurismoIcon
                    color={colors.onPrimary}
                    name="mapPin"
                    size={18}
                  />
                ) : (
                  <Text
                    style={[styles.markerText, { color: colors.onPrimary }]}
                  >
                    {group.centers.length}
                  </Text>
                )}
              </View>
            </Pressable>
          </Marker>
        ))}
      </MapLibreMap>
    </View>
  );
}

// Base pública sin credenciales, únicamente para desarrollo local. Producción debe
// configurar un estilo/versionado y su política de disponibilidad por entorno.
function developmentMapStyle(scheme: "light" | "dark") {
  const dark = scheme === "dark";
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
        paint: { "background-color": dark ? "#0D2022" : "#E8EFEE" },
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
  markerPressable: { alignItems: "center" },
  marker: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 5,
  },
  markerText: { fontWeight: "800" },
});

function clusterCenters(
  centers: readonly PublicCenter[],
  zoom: number,
): readonly MarkerGroup[] {
  const cell = 0.08 / Math.max(1, 2 ** Math.max(0, zoom - 9));
  const groups = new globalThis.Map<string, PublicCenter[]>();
  for (const center of centers) {
    const key = `${Math.floor(center.longitude / cell)}:${Math.floor(center.latitude / cell)}`;
    groups.set(key, [...(groups.get(key) ?? []), center]);
  }
  return [...groups.values()].map((items) => ({
    centers: items,
    longitude:
      items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
    latitude:
      items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
  }));
}
