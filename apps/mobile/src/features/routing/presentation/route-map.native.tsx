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
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
import {
  normalizeBearing,
  shouldPublishHeading,
  smoothBearing,
  type PublishedHeading,
} from "../domain/navigation-heading";
import type { CalculatedRoute } from "../domain/routing";
import type { RouteMapProps } from "./route-map.types";

type EndpointProperties = Readonly<{
  heading?: number;
  kind: "origin" | "destination" | "current";
}>;

const navigationCameraLeadMeters = 30;
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
  attributionBottom,
  currentLocation = null,
  destination,
  following = false,
  navigationActive = false,
  onFollowingChange,
  onUserInteraction,
  origin,
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
  // Smoothed compass bearing (every event) and the last one drawn/used by
  // the camera (throttled), so the compass does not re-render per event.
  const headingRef = useRef<number | null>(null);
  const publishedHeadingRef = useRef<PublishedHeading | null>(null);
  const [navigationHeading, setNavigationHeading] = useState(0);
  // While a fresh fix is pending (e.g. after returning to the app), the
  // camera stays on the last drawn position instead of the route origin.
  const [lastLocation, setLastLocation] = useState<GeoCoordinate | null>(null);
  const latestLocation = navigationActive
    ? (currentLocation ?? lastLocation)
    : null;
  if (latestLocation !== lastLocation) setLastLocation(latestLocation);
  const followCenter = latestLocation ?? origin;

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
    // Overview: north up and flat, also right after navigation stops.
    cameraRef.current?.fitBounds(bounds, {
      bearing: 0,
      duration: fitBoundsDurationMs,
      padding: routeBoundsPadding,
      pitch: 0,
    });
  }, [bounds, nativeReady, navigationActive]);

  const handleHeading = useEffectEvent(
    ({ magHeading, trueHeading }: Location.LocationHeadingObject) => {
      if (!isActive()) return;
      const nextHeading = trueHeading >= 0 ? trueHeading : magHeading;
      if (!Number.isFinite(nextHeading) || nextHeading < 0) return;

      const targetBearing = normalizeBearing(nextHeading);
      const bearing =
        headingRef.current === null
          ? targetBearing
          : smoothBearing(headingRef.current, targetBearing);
      headingRef.current = bearing;

      const now = Date.now();
      if (!shouldPublishHeading(publishedHeadingRef.current, bearing, now)) {
        return;
      }
      publishedHeadingRef.current = { at: now, bearing };
      setNavigationHeading(bearing);
      if (!following || !followCenter) return;
      cameraRef.current?.easeTo({
        bearing,
        center: getNavigationCameraCenter(followCenter, bearing),
        duration: navigationCameraAnimationDurationMs,
        easing: "linear",
        pitch: navigationPitch,
        zoom: navigationZoom,
      });
    },
  );

  useEffect(() => {
    if (!navigationActive || !nativeReady) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    Location.watchHeadingAsync(
      (heading) => {
        if (!cancelled) handleHeading(heading);
      },
      () => undefined,
    ).then(
      (nextSubscription) => {
        if (cancelled || !isActive()) {
          nextSubscription.remove();
          return;
        }
        subscription = nextSubscription;
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
      subscription?.remove();
      headingRef.current = null;
      publishedHeadingRef.current = null;
    };
  }, [isActive, nativeReady, navigationActive]);

  // Follow mode is owned by the screen; the camera only reacts to it while
  // navigating, so stopping navigation never overrides the overview above.
  useEffect(() => {
    if (!nativeReady || !navigationActive || !following || !followCenter) {
      return;
    }
    const bearing = headingRef.current ?? 0;
    cameraRef.current?.easeTo({
      bearing,
      center: getNavigationCameraCenter(followCenter, bearing),
      duration: recenterDurationMs,
      easing: "ease",
      pitch: navigationPitch,
      zoom: navigationZoom,
    });
  }, [followCenter, following, loadState, nativeReady, navigationActive]);

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
          // Every gesture pauses following again (and restarts its resume).
          if (navigationActive) onFollowingChange?.(false);
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

      <MapAttributionButton
        bottom={attributionBottom}
        onPress={showAttribution}
      />
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
