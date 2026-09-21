import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type MapRef,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
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
  navigationActive?: boolean;
  onUserInteraction?: () => void;
  origin: RouteCoordinate | null;
  recenterKey?: number;
  route: CalculatedRoute | null;
}>;

type EndpointProperties = Readonly<{
  heading?: number;
  kind: "origin" | "destination" | "current";
  navigationActive?: boolean;
}>;

export function RouteMap({
  currentLocation = null,
  destination,
  fullScreen = false,
  navigationActive = false,
  onUserInteraction,
  origin,
  recenterKey = 0,
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
  const latestCenterRef = useRef(currentLocation ?? origin);
  const isFollowingRef = useRef(navigationActive);
  const wasNavigationActiveRef = useRef(navigationActive);
  const headingRef = useRef(0);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const [navigationHeading, setNavigationHeading] = useState(0);

  useEffect(() => {
    latestCenterRef.current = currentLocation ?? origin;
  }, [currentLocation, origin]);

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
                properties: {
                  heading: navigationHeading,
                  kind: "current" as const,
                  navigationActive,
                },
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
        ...(origin && !navigationActive
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
    [currentLocation, destination, navigationActive, navigationHeading, origin],
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
            pitch: navigationActive ? 60 : 0,
            zoom: 14,
          },
    [bounds, destination, navigationActive],
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
    if (navigationActive) return;
    cameraRef.current?.fitBounds(bounds, {
      duration: 450,
      padding: { top: 36, right: 28, bottom: 36, left: 28 },
    });
  }, [bounds, navigationActive]);

  useEffect(() => {
    if (!navigationActive) {
      headingRef.current = 0;
      headingSubscriptionRef.current?.remove();
      headingSubscriptionRef.current = null;
      return;
    }

    let cancelled = false;
    void Location.watchHeadingAsync(
      ({ magHeading, trueHeading }) => {
        const nextHeading = trueHeading >= 0 ? trueHeading : magHeading;
        if (!Number.isFinite(nextHeading) || nextHeading < 0) return;

        const bearing = normalizeBearing(nextHeading);
        headingRef.current = bearing;
        setNavigationHeading(bearing);
        if (!isFollowingRef.current) return;
        const center = latestCenterRef.current;
        if (!center) return;

        cameraRef.current?.easeTo({
          bearing,
          center: [center.longitude, center.latitude],
          duration: 180,
          easing: "linear",
          pitch: 60,
          zoom: 19,
        });
      },
      () => undefined,
    )
      .then((subscription) => {
        if (cancelled) {
          subscription.remove();
          return;
        }
        headingSubscriptionRef.current = subscription;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      headingSubscriptionRef.current?.remove();
      headingSubscriptionRef.current = null;
    };
  }, [navigationActive]);

  useEffect(() => {
    const becameActive = navigationActive && !wasNavigationActiveRef.current;
    wasNavigationActiveRef.current = navigationActive;

    if (!navigationActive) {
      isFollowingRef.current = false;
      return;
    }
    if (becameActive) isFollowingRef.current = true;
    const center = currentLocation ?? latestCenterRef.current;
    if (!isFollowingRef.current || !center) return;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: [center.longitude, center.latitude],
      duration: 400,
      easing: "ease",
      pitch: 60,
      zoom: 19,
    });
  }, [currentLocation, mapLoadState, navigationActive]);

  useEffect(() => {
    if (!recenterKey) return;
    const center = latestCenterRef.current;
    if (!center) return;
    isFollowingRef.current = true;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: [center.longitude, center.latitude],
      duration: 400,
      easing: "ease",
      pitch: navigationActive ? 60 : 0,
      zoom: 19,
    });
  }, [mapLoadState, navigationActive, recenterKey]);

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
        compass={false}
        dragPan
        logo={false}
        mapStyle={style ?? getFallbackMapStyle(scheme)}
        onDidFailLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingStyle={() => setMapLoadState("ready")}
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction) {
            isFollowingRef.current = false;
            onUserInteraction?.();
          }
        }}
        ref={mapRef}
        style={styles.map}
        touchPitch
        touchRotate
        touchZoom
      >
        <Camera
          initialViewState={initialViewState}
          maxZoom={19}
          minZoom={3}
          pitch={navigationActive ? 60 : 0}
          ref={cameraRef}
        />
        <Images
          images={{
            "tourism-navigation-mode": require("../../../../assets/images/navigation-mode.png"),
          }}
        />
        <GeoJSONSource data={routeData} id="calculated-route-source">
          <Layer
            id="calculated-route-line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": colors.location,
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
              "circle-color": colors.location,
              "circle-radius": 7,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
          <Layer
            filter={[
              "all",
              ["==", ["get", "kind"], "current"],
              ["==", ["get", "navigationActive"], false],
            ]}
            id="calculated-route-current-halo"
            paint={{
              "circle-color": colors.locationSoft,
              "circle-radius": 18,
            }}
            type="circle"
          />
          <Layer
            filter={[
              "all",
              ["==", ["get", "kind"], "current"],
              ["==", ["get", "navigationActive"], false],
            ]}
            id="calculated-route-current"
            paint={{
              "circle-color": colors.location,
              "circle-radius": 9,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 3,
            }}
            type="circle"
          />
          <Layer
            filter={[
              "all",
              ["==", ["get", "kind"], "current"],
              ["==", ["get", "navigationActive"], true],
            ]}
            id="calculated-route-current-navigation"
            layout={{
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-image": "tourism-navigation-mode",
              "icon-pitch-alignment": "viewport",
              "icon-rotate": ["get", "heading"],
              "icon-rotation-alignment": "viewport",
              "icon-size": 0.15,
            }}
            type="symbol"
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

function normalizeBearing(heading: number): number {
  const bearing = heading % 360;
  return bearing < 0 ? bearing + 360 : bearing;
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
