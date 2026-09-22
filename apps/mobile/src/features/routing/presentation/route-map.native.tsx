import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { getCoordinateBounds } from "@/core/geo/bounds";
import { offsetCoordinate } from "@/core/geo/distance";
import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import { useTurismoMapPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { MapAttributionButton } from "@/features/map/presentation/map-attribution-button";
import { MapLoadingOverlay } from "@/features/map/presentation/map-loading-overlay";
import { useBasemapStyle } from "@/features/map/presentation/use-basemap-style";
import { useMapLifecycle } from "@/features/map/presentation/use-map-lifecycle";
import { UserLocationLayers } from "@/features/map/presentation/user-location-layers";
import type { CalculatedRoute } from "../domain/routing";
import type { RouteMapProps } from "./route-map.types";

type EndpointProperties = Readonly<{
  heading?: number;
  kind: "origin" | "destination" | "current";
}>;

const navigationCameraLeadMeters = 30;
const navigationHeadingSmoothingFactor = 0.18;
const navigationCameraAnimationDurationMs = 260;
const recenterDurationMs = 400;
const fitBoundsDurationMs = 450;
const navigationPitch = 60;
const navigationZoom = 19;
const routeBoundsPadding = { top: 36, right: 28, bottom: 36, left: 28 };

const routeMapImages = {
  "tourism-navigation-mode": require("../../../../assets/images/navigation-mode.png"),
};

export function RouteMap({
  currentLocation = null,
  destination,
  navigationActive = false,
  onUserInteraction,
  origin,
  recenterKey = 0,
  route,
}: RouteMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const { scheme } = useTurismoTheme();
  const colors = useTurismoMapPalette();
  const mapStyle = useBasemapStyle(scheme);
  const {
    isActive,
    loadState,
    markFailed,
    markReady,
    nativeReady,
    showAttribution,
    showLoadingOverlay,
  } = useMapLifecycle(mapRef);
  const latestCenterRef = useRef(currentLocation ?? origin);
  const isFollowingRef = useRef(navigationActive);
  const wasNavigationActiveRef = useRef(navigationActive);
  const headingRef = useRef(0);
  const hasHeadingRef = useRef(false);
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
  // Durante la navegación, la posición actual se dibuja como flecha
  // orientada; fuera de ella, como el punto azul compartido con Explorar.
  const endpointData = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, EndpointProperties>
  >(
    () => ({
      type: "FeatureCollection",
      features: [
        ...(currentLocation && navigationActive
          ? [
              pointFeature(currentLocation, {
                heading: navigationHeading,
                kind: "current" as const,
              }),
            ]
          : []),
        ...(origin && !navigationActive
          ? [pointFeature(origin, { kind: "origin" as const })]
          : []),
        pointFeature(destination, { kind: "destination" as const }),
      ],
    }),
    [currentLocation, destination, navigationActive, navigationHeading, origin],
  );
  const bounds = useMemo(
    () => getRouteBounds(route, origin, destination),
    [destination, origin, route],
  );
  const initialViewState = useMemo(
    () => ({ bounds, padding: routeBoundsPadding }),
    [bounds],
  );

  useEffect(() => {
    if (!nativeReady || navigationActive) return;
    cameraRef.current?.fitBounds(bounds, {
      duration: fitBoundsDurationMs,
      padding: routeBoundsPadding,
    });
  }, [bounds, nativeReady, navigationActive]);

  useEffect(() => {
    if (!navigationActive || !nativeReady) {
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
        if (cancelled || !isActive()) return;
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
          pitch: navigationPitch,
          zoom: navigationZoom,
        });
      },
      () => undefined,
    )
      .then((subscription) => {
        if (cancelled || !isActive()) {
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
  }, [isActive, nativeReady, navigationActive]);

  useEffect(() => {
    const becameActive = navigationActive && !wasNavigationActiveRef.current;
    wasNavigationActiveRef.current = navigationActive;

    if (!navigationActive) {
      isFollowingRef.current = false;
      return;
    }
    if (becameActive) isFollowingRef.current = true;
    if (!nativeReady) return;
    const center = currentLocation ?? latestCenterRef.current;
    if (!isFollowingRef.current || !center) return;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: getNavigationCameraCenter(center, headingRef.current),
      duration: recenterDurationMs,
      easing: "ease",
      pitch: navigationPitch,
      zoom: navigationZoom,
    });
  }, [currentLocation, loadState, nativeReady, navigationActive]);

  useEffect(() => {
    if (!recenterKey || !nativeReady) return;
    const center = latestCenterRef.current;
    if (!center) return;
    isFollowingRef.current = true;
    cameraRef.current?.easeTo({
      bearing: headingRef.current,
      center: navigationActive
        ? getNavigationCameraCenter(center, headingRef.current)
        : [center.longitude, center.latitude],
      duration: recenterDurationMs,
      easing: "ease",
      pitch: navigationActive ? navigationPitch : 0,
      zoom: navigationZoom,
    });
  }, [loadState, nativeReady, navigationActive, recenterKey]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa de la ruta calculada"
        attribution={false}
        androidView="texture"
        compass={false}
        dragPan
        logo={false}
        mapStyle={mapStyle}
        onDidFailLoadingMap={markFailed}
        onDidFinishLoadingMap={markReady}
        onDidFinishLoadingStyle={markReady}
        onRegionWillChange={(event) => {
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
          maxZoom={navigationZoom}
          minZoom={3}
          pitch={navigationActive ? navigationPitch : 0}
          ref={cameraRef}
        />
        <Images images={routeMapImages} />
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
            filter={["==", ["get", "kind"], "current"]}
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
        <UserLocationLayers
          coordinate={navigationActive ? null : currentLocation}
          dotRadius={9}
          dotStrokeWidth={3}
          haloRadius={18}
          idPrefix="calculated-route-user-location"
        />
      </MapLibreMap>

      <MapAttributionButton onPress={showAttribution} />
      <MapLoadingOverlay visible={showLoadingOverlay} />
    </View>
  );
}

function pointFeature<P extends EndpointProperties>(
  coordinate: GeoCoordinate,
  properties: P,
): GeoJSON.Feature<GeoJSON.Point, P> {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: [coordinate.longitude, coordinate.latitude],
    },
  };
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

/** Puts the camera slightly ahead so more of the upcoming road is visible. */
function getNavigationCameraCenter(
  coordinate: GeoCoordinate,
  bearing: number,
): [number, number] {
  const center = offsetCoordinate(
    coordinate,
    navigationCameraLeadMeters,
    bearing,
  );
  return [center.longitude, center.latitude];
}

function getRouteBounds(
  route: CalculatedRoute | null,
  origin: GeoCoordinate | null,
  destination: GeoCoordinate,
): GeoBoundingBox {
  const destinationPoint: [number, number] = [
    destination.longitude,
    destination.latitude,
  ];
  const coordinates: (readonly [number, number])[] = [
    ...(origin ? [[origin.longitude, origin.latitude] as const] : []),
    destinationPoint,
    ...(route?.geometry.coordinates ?? []),
  ];
  // The destination is always present, so the box is never empty.
  return (
    getCoordinateBounds(coordinates) ?? [
      ...destinationPoint,
      ...destinationPoint,
    ]
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: { flex: 1 },
});
