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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const navigationCameraLeadMeters = 30;
const navigationHeadingSmoothingFactor = 0.18;
const navigationCameraAnimationDurationMs = 260;
const earthRadiusMeters = 6_371_000;

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
  const hasHeadingRef = useRef(false);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const mapMountedRef = useRef(false);
  const nativeMapReadyRef = useRef(false);
  const [navigationHeading, setNavigationHeading] = useState(0);
  const [nativeMapReady, setNativeMapReady] = useState(false);

  const markMapReady = useCallback(() => {
    if (!mapMountedRef.current) return;
    nativeMapReadyRef.current = true;
    setNativeMapReady(true);
    setMapLoadState("ready");
  }, []);

  useEffect(() => {
    mapMountedRef.current = true;
    return () => {
      mapMountedRef.current = false;
      nativeMapReadyRef.current = false;
    };
  }, []);

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
        if (!cancelled) setStyle(nextStyle);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  useEffect(() => {
    if (!nativeMapReady || !mapMountedRef.current || navigationActive) return;
    cameraRef.current?.fitBounds(bounds, {
      duration: 450,
      padding: { top: 36, right: 28, bottom: 36, left: 28 },
    });
  }, [bounds, nativeMapReady, navigationActive]);

  useEffect(() => {
    if (!navigationActive || !nativeMapReady) {
      if (!navigationActive) {
        headingRef.current = 0;
        hasHeadingRef.current = false;
        headingSubscriptionRef.current?.remove();
        headingSubscriptionRef.current = null;
      }
      return;
    }

    let cancelled = false;
    void Location.watchHeadingAsync(
      ({ magHeading, trueHeading }) => {
        if (cancelled || !mapMountedRef.current || !nativeMapReadyRef.current) {
          return;
        }
        const nextHeading = trueHeading >= 0 ? trueHeading : magHeading;
        if (!Number.isFinite(nextHeading) || nextHeading < 0) return;

        const targetBearing = normalizeBearing(nextHeading);
        const bearing = hasHeadingRef.current
          ? smoothBearing(
              headingRef.current,
              targetBearing,
              navigationHeadingSmoothingFactor,
            )
          : targetBearing;
        hasHeadingRef.current = true;
        headingRef.current = bearing;
        setNavigationHeading(bearing);
        if (!isFollowingRef.current) return;
        const center = latestCenterRef.current;
        if (!center) return;

        cameraRef.current?.easeTo({
          bearing,
          center: getNavigationCameraCenter(center, bearing),
          duration: navigationCameraAnimationDurationMs,
          easing: "linear",
          pitch: 60,
          zoom: 19,
        });
      },
      () => undefined,
    )
      .then((subscription) => {
        if (cancelled || !mapMountedRef.current) {
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
  }, [nativeMapReady, navigationActive]);

  useEffect(() => {
    const becameActive = navigationActive && !wasNavigationActiveRef.current;
    wasNavigationActiveRef.current = navigationActive;

    if (!navigationActive) {
      isFollowingRef.current = false;
      return;
    }
    if (becameActive) isFollowingRef.current = true;
    if (!nativeMapReady || !mapMountedRef.current) return;
    const center = currentLocation ?? latestCenterRef.current;
    if (!isFollowingRef.current || !center) return;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: getNavigationCameraCenter(center, headingRef.current),
      duration: 400,
      easing: "ease",
      pitch: 60,
      zoom: 19,
    });
  }, [currentLocation, mapLoadState, nativeMapReady, navigationActive]);

  useEffect(() => {
    if (!recenterKey || !nativeMapReady || !mapMountedRef.current) return;
    const center = latestCenterRef.current;
    if (!center) return;
    isFollowingRef.current = true;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: navigationActive
        ? getNavigationCameraCenter(center, headingRef.current)
        : [center.longitude, center.latitude],
      duration: 400,
      easing: "ease",
      pitch: navigationActive ? 60 : 0,
      zoom: 19,
    });
  }, [mapLoadState, nativeMapReady, navigationActive, recenterKey]);

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
        onDidFailLoadingMap={markMapReady}
        onDidFinishLoadingMap={markMapReady}
        onDidFinishLoadingStyle={markMapReady}
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction) {
            isFollowingRef.current = false;
            onUserInteraction?.();
          }
        }}
        onRegionDidChange={(event) => {
          if (!event.nativeEvent.userInteraction) return;
          isFollowingRef.current = false;
          onUserInteraction?.();
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
              // El rumbo de la flecha usa el mismo marco que la cámara:
              // al orientar el mapa hacia delante, la punta queda arriba.
              "icon-rotation-alignment": "map",
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
          if (!mapMountedRef.current || !nativeMapReadyRef.current) return;
          const attributionRequest = mapRef.current?.showAttribution();
          void attributionRequest?.catch(() => undefined);
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

function smoothBearing(
  currentBearing: number,
  targetBearing: number,
  factor: number,
): number {
  const delta = ((targetBearing - currentBearing + 540) % 360) - 180;
  return normalizeBearing(currentBearing + delta * factor);
}

function getNavigationCameraCenter(
  coordinate: RouteCoordinate,
  bearing: number,
): [number, number] {
  const angularDistance = navigationCameraLeadMeters / earthRadiusMeters;
  const bearingRadians = (bearing * Math.PI) / 180;
  const latitudeRadians = (coordinate.latitude * Math.PI) / 180;
  const longitudeRadians = (coordinate.longitude * Math.PI) / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) *
        Math.sin(angularDistance) *
        Math.cos(bearingRadians),
  );
  const nextLongitude =
    longitudeRadians +
    Math.atan2(
      Math.sin(bearingRadians) *
        Math.sin(angularDistance) *
        Math.cos(latitudeRadians),
      Math.cos(angularDistance) -
        Math.sin(latitudeRadians) * Math.sin(nextLatitude),
    );

  return [
    normalizeLongitude((nextLongitude * 180) / Math.PI),
    (nextLatitude * 180) / Math.PI,
  ];
}

function normalizeLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180;
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
