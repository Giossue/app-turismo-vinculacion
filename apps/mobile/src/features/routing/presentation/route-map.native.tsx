import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type MapRef,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getTurismoMapColors } from "@/core/ui/tokens";
import { useTurismoTheme } from "@/core/ui/theme-context";
import {
  getFallbackMapStyle,
  loadSelfHostedMapStyle,
} from "@/features/map/presentation/center-map.native";
import { MapAttributionButton } from "@/features/map/presentation/map-attribution-button";
import type { CalculatedRoute, RouteCoordinate } from "../domain/routing";

export type RouteMapProps = Readonly<{
  currentLocation?: RouteCoordinate | null;
  destination: RouteCoordinate;
  fullScreen?: boolean;
  origin: RouteCoordinate | null;
  route: CalculatedRoute | null;
}>;

type EndpointProperties = Readonly<{
  kind: "origin" | "destination" | "current";
}>;

export function RouteMap({
  currentLocation = null,
  destination,
  fullScreen = false,
  origin,
  route,
}: RouteMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const { scheme } = useTurismoTheme();
  const colors = getTurismoMapColors(scheme);
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const [mapLoadState, setMapLoadState] = useState<"loading" | "ready">(
    "loading",
  );

  const routeData = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: "FeatureCollection",
      features: route
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          ]
        : [],
    }),
    [route],
  );
  const endpointData = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, EndpointProperties>
  >(
    () => ({
      type: "FeatureCollection",
      features: [
        ...(currentLocation
          ? [
              {
                type: "Feature" as const,
                properties: { kind: "current" as const },
                geometry: {
                  type: "Point" as const,
                  coordinates: [
                    currentLocation.longitude,
                    currentLocation.latitude,
                  ] as [number, number],
                },
              },
            ]
          : []),
        ...(origin
          ? [
              {
                type: "Feature" as const,
                properties: { kind: "origin" as const },
                geometry: {
                  type: "Point" as const,
                  coordinates: [origin.longitude, origin.latitude] as [
                    number,
                    number,
                  ],
                },
              },
            ]
          : []),
        {
          type: "Feature" as const,
          properties: { kind: "destination" as const },
          geometry: {
            type: "Point" as const,
            coordinates: [destination.longitude, destination.latitude] as [
              number,
              number,
            ],
          },
        },
      ],
    }),
    [currentLocation, destination, origin],
  );
  const bounds = useMemo(
    () => getRouteBounds(route, origin, destination),
    [destination, origin, route],
  );
  const initialViewState = useMemo(
    () =>
      bounds
        ? {
            bounds,
            padding: { top: 36, right: 28, bottom: 36, left: 28 },
          }
        : {
            center: [destination.longitude, destination.latitude] as [
              number,
              number,
            ],
            zoom: 14,
          },
    [bounds, destination],
  );

  useEffect(() => {
    let cancelled = false;
    loadSelfHostedMapStyle(scheme, "navigation")
      .then((nextStyle) => {
        if (!cancelled) {
          setStyle(nextStyle);
          setMapLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setMapLoadState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  useEffect(() => {
    cameraRef.current?.fitBounds(bounds, {
      duration: 450,
      padding: { top: 36, right: 28, bottom: 36, left: 28 },
    });
  }, [bounds]);

  return (
    <View
      style={[
        styles.container,
        fullScreen ? styles.fullScreenContainer : styles.cardContainer,
      ]}
    >
      <MapLibreMap
        accessibilityLabel="Mapa de la ruta calculada"
        attribution={false}
        androidView="texture"
        compass
        logo={false}
        mapStyle={style ?? getFallbackMapStyle(scheme)}
        onDidFailLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingStyle={() => setMapLoadState("ready")}
        ref={mapRef}
        style={styles.map}
      >
        <Camera
          initialViewState={initialViewState}
          maxZoom={19}
          minZoom={3}
          ref={cameraRef}
        />
        <GeoJSONSource data={routeData} id="calculated-route-source">
          <Layer
            id="calculated-route-line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": colors.info,
              "line-opacity": 0.92,
              "line-width": 5,
            }}
            type="line"
          />
        </GeoJSONSource>
        <GeoJSONSource data={endpointData} id="calculated-route-endpoints">
          <Layer
            filter={["==", ["get", "kind"], "origin"]}
            id="calculated-route-origin"
            paint={{
              "circle-color": colors.info,
              "circle-radius": 7,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
          <Layer
            filter={["==", ["get", "kind"], "current"]}
            id="calculated-route-current"
            paint={{
              "circle-color": colors.location,
              "circle-radius": 8,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
          <Layer
            filter={["==", ["get", "kind"], "destination"]}
            id="calculated-route-destination"
            paint={{
              "circle-color": colors.primary,
              "circle-radius": 8,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
        </GeoJSONSource>
      </MapLibreMap>
      <MapAttributionButton
        onPress={() => {
          void mapRef.current?.showAttribution();
        }}
      />
      {mapLoadState === "loading" ? (
        <View
          pointerEvents="none"
          style={[
            styles.loading,
            { backgroundColor: colors.background, opacity: 0.86 },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

function getRouteBounds(
  route: CalculatedRoute | null,
  origin: RouteCoordinate | null,
  destination: RouteCoordinate,
): [number, number, number, number] {
  const coordinates = [
    ...(origin
      ? [[origin.longitude, origin.latitude] as [number, number]]
      : []),
    [destination.longitude, destination.latitude] as [number, number],
    ...(route?.geometry.coordinates ?? []),
  ];
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardContainer: { height: 260 },
  fullScreenContainer: { flex: 1 },
  map: { flex: 1 },
  loading: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
