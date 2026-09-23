import { Stack, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { GeoCoordinate } from "@/core/geo/types";
import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { prepareNavigationTracking } from "@/features/routing/application/prepare-navigation-tracking";
import { useCalculatedRoute } from "@/features/routing/application/use-calculated-route";
import { useNavigationFollow } from "@/features/routing/application/use-navigation-follow";
import { useNavigationRoute } from "@/features/routing/application/use-navigation-route";
import { useNavigationSession } from "@/features/routing/application/use-navigation-session";
import { useRouteScreenParams } from "@/features/routing/application/use-route-screen-params";
import { getRouteErrorMessage } from "@/features/routing/data/routing-api";
import type { RouteMode } from "@/features/routing/domain/routing";
import { ActiveNavigationOverlay } from "@/features/routing/presentation/active-navigation-overlay";
import { RouteMap } from "@/features/routing/presentation/route-map";
import { RoutePreviewPanel } from "@/features/routing/presentation/route-preview-panel";

/**
 * «Cómo llegar»: full-screen MapLibre with an inline preview panel and, once
 * started, the active navigation mode. Like Explorar, it is a full-screen
 * map exception to `TourismScreenFrame`.
 *
 * Navigation lifecycle (see `docs/architecture/mobile.md`): this screen only
 * toggles `navigationActive`; `useNavigationSession` owns tracking and its
 * teardown. Stopping, or a `blur` (another screen pushed on top), sets it to
 * false and the session stops the task and clears the stored session. A pure
 * unmount emits no `blur` and changes nothing, so a navigation survives
 * Android destroying the activity while the app is hidden.
 */
export default function RouteScreen() {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const {
    destination,
    destinationName,
    mode: initialMode,
  } = useRouteScreenParams();
  const [mode, setMode] = useState<RouteMode>(initialMode);
  const [origin, setOrigin] = useState<GeoCoordinate | null>(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [startingNavigation, setStartingNavigation] = useState(false);
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [mapBottomInset, setMapBottomInset] = useState(0);
  // Guards double taps before the `startingNavigation` render lands.
  const startInFlightRef = useRef(false);
  const {
    message: locationMessage,
    requestLocation,
    status: locationStatus,
  } = useUserLocation();
  const follow = useNavigationFollow(navigationActive);

  const request =
    routeRequested && origin && destination
      ? { destination, mode, origin }
      : null;
  const routeQuery = useCalculatedRoute(request);
  const isCalculating = request !== null && routeQuery.isFetching;
  const route = useNavigationRoute(routeQuery.data ?? null, navigationActive);
  const routeError = routeQuery.error
    ? getRouteErrorMessage(routeQuery.error)
    : null;

  const navigationSession = useNavigationSession({
    active: navigationActive,
    destination,
    isRecalculating: isCalculating,
    mode,
    onReroute: (nextOrigin) => {
      setNavigationNotice(null);
      setOrigin(nextOrigin);
    },
    route,
  });

  // `blur` fires when another screen covers this one, never on a bare
  // unmount; leaving the screen ends an active navigation.
  useEffect(
    () => navigation.addListener("blur", () => setNavigationActive(false)),
    [navigation],
  );

  // Active navigation is a dedicated mode: only its close control leaves it.
  useScreenBackHandler(() => navigationActive || startingNavigation);

  useEffect(() => {
    if (!destination || origin || routeRequested || navigationActive) return;

    let cancelled = false;
    void requestLocation({ forceRefresh: true }).then((coordinate) => {
      if (cancelled || !coordinate) return;
      setOrigin(coordinate);
      setRouteRequested(true);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, navigationActive, origin, requestLocation, routeRequested]);

  const closeRoute = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleCalculateRoute = async () => {
    if (!destination || isCalculating || navigationActive) return;

    if (origin) {
      setRouteRequested(true);
      if (routeQuery.isError) void routeQuery.refetch();
      return;
    }

    const coordinate = await requestLocation({ forceRefresh: true });
    if (!coordinate) return;
    setOrigin(coordinate);
    setRouteRequested(true);
  };

  const handleStartNavigation = async () => {
    if (!destination || !route || isCalculating || navigationActive) return;
    if (startInFlightRef.current) return;

    if (auth.status !== "authenticated") {
      if (auth.status === "anonymous") {
        setNavigationNotice(null);
        router.push(buildLoginHref("/route"));
      }
      return;
    }

    const isCancelled = () => !navigation.isFocused();
    startInFlightRef.current = true;
    setStartingNavigation(true);
    try {
      const coordinate = await requestLocation({ forceRefresh: true });
      if (!coordinate || isCancelled()) return;

      const preparation = await prepareNavigationTracking(isCancelled);
      if (preparation.status === "cancelled") return;
      setNavigationNotice(preparation.notice);
      setNavigationActive(true);
    } finally {
      startInFlightRef.current = false;
      setStartingNavigation(false);
    }
  };

  const handleStopNavigation = () => {
    setPreviewExpanded(true);
    setNavigationNotice(null);
    setNavigationActive(false);
  };

  if (!destination) {
    return (
      <TourismScreenFrame onBack={closeRoute} title="Cómo llegar">
        <TourismStateView
          icon="mapPin"
          message="Vuelve a la ficha del lugar y elige «Cómo llegar» otra vez."
          title="No encontramos el destino de esta ruta"
          variant="error"
        />
      </TourismScreenFrame>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.map.background }]}>
      <Stack.Screen
        options={{ gestureEnabled: !navigationActive, headerShown: false }}
      />
      <RouteMap
        attributionBottom={mapBottomInset + turismoSpacing.xxs}
        currentLocation={
          navigationActive ? navigationSession.currentLocation : null
        }
        destination={destination}
        following={follow.following}
        navigationActive={navigationActive}
        onFollowingChange={follow.setFollowing}
        onUserInteraction={
          navigationActive ? undefined : () => setPreviewExpanded(false)
        }
        origin={origin}
        route={route}
      />
      {!navigationActive ? (
        <RoutePreviewPanel
          destinationName={destinationName}
          expanded={previewExpanded}
          isCalculating={isCalculating}
          locationMessage={locationMessage}
          locationRequesting={locationStatus === "requesting"}
          mode={mode}
          navigationNotice={navigationNotice}
          onCalculateRoute={() => void handleCalculateRoute()}
          onClose={() => {
            if (!startingNavigation) closeRoute();
          }}
          onExpandedChange={setPreviewExpanded}
          onHeightChange={setMapBottomInset}
          onModeChange={setMode}
          onStartNavigation={() => void handleStartNavigation()}
          route={route}
          routeError={routeError}
          startingNavigation={startingNavigation}
        />
      ) : route ? (
        <ActiveNavigationOverlay
          guidance={navigationSession.nextInstruction}
          isFollowing={follow.following}
          isRecalculating={isCalculating}
          message={navigationSession.message}
          notice={
            navigationSession.backgroundNotice ?? navigationNotice ?? routeError
          }
          onBottomInsetChange={setMapBottomInset}
          onRecenter={() => follow.setFollowing(true)}
          onStop={handleStopNavigation}
          remainingDistanceMeters={navigationSession.remainingDistanceMeters}
          remainingDurationSeconds={navigationSession.remainingDurationSeconds}
          route={route}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
