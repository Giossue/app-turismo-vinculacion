import { Stack, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import type { GeoCoordinate } from "@/core/geo/types";
import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { useCalculatedRoute } from "@/features/routing/application/use-calculated-route";
import { useNavigationFollow } from "@/features/routing/application/use-navigation-follow";
import { useNavigationRoute } from "@/features/routing/application/use-navigation-route";
import { useNavigationSession } from "@/features/routing/application/use-navigation-session";
import { useRouteScreenParams } from "@/features/routing/application/use-route-screen-params";
import { useSavedCalculatedRoute } from "@/features/routing/application/use-saved-routes";
import { getRouteErrorMessage } from "@/features/routing/data/routing-api";
import {
  describeSavedRouteError,
  type SavedCalculatedRoute,
} from "@/features/routing/data/saved-routes-storage";
import {
  getRemoteRouteRequest,
  savedRouteNavigationNotice,
} from "@/features/routing/domain/route-source";
import type { RouteMode } from "@/features/routing/domain/routing";
import {
  requestNavigationBackgroundPermission,
  requestNavigationNotificationPermission,
} from "@/features/routing/infrastructure/navigation-background-task";
import { ActiveNavigationOverlay } from "@/features/routing/presentation/active-navigation-overlay";
import { RouteMap } from "@/features/routing/presentation/route-map";
import { RoutePreviewPanel } from "@/features/routing/presentation/route-preview-panel";
import type { ParsedRouteSearchParams } from "@/features/routing/presentation/route-href";

/** Load a chosen saved route before mounting anything that can request GPS. */
export default function RouteScreen() {
  const params = useRouteScreenParams();
  const auth = useAuth();
  const router = useRouter();
  const savedQuery = useSavedCalculatedRoute(params.savedRouteKey);
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  if (!params.savedRouteKey) {
    return <RouteScreenContent params={params} savedRoute={null} />;
  }
  if (auth.status === "anonymous") {
    return (
      <TourismScreenFrame onBack={close} title="Ruta guardada">
        <TourismStateView
          actionIcon="user"
          actionLabel="Iniciar sesión"
          icon="navigation"
          message="Inicia sesión con la cuenta que guardó esta ruta en el dispositivo."
          onAction={() => router.push(buildLoginHref("/route"))}
          variant="empty"
        />
      </TourismScreenFrame>
    );
  }
  if (auth.status === "loading" || savedQuery.isPending) {
    return (
      <TourismScreenFrame onBack={close} title="Ruta guardada">
        <TourismStateView
          message="Abriendo el recorrido guardado en este dispositivo…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }
  if (!savedQuery.data) {
    return (
      <TourismScreenFrame onBack={close} title="Ruta guardada">
        <TourismStateView
          icon="navigation"
          message={
            savedQuery.error
              ? describeSavedRouteError(savedQuery.error)
              : "La ruta pudo haberse eliminado o estar guardada en otra cuenta."
          }
          onAction={
            savedQuery.error ? () => void savedQuery.refetch() : undefined
          }
          title="No pudimos abrir esta ruta"
          variant="error"
        />
      </TourismScreenFrame>
    );
  }
  return (
    <RouteScreenContent
      key={savedQuery.data.key}
      params={params}
      savedRoute={savedQuery.data}
    />
  );
}

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
function RouteScreenContent({
  params,
  savedRoute,
}: Readonly<{
  params: ParsedRouteSearchParams;
  savedRoute: SavedCalculatedRoute | null;
}>) {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const destination = savedRoute?.destination ?? params.destination;
  const destinationName = savedRoute?.destinationName ?? params.destinationName;
  const initialMode = savedRoute?.mode ?? params.mode;
  const [mode, setMode] = useState<RouteMode>(initialMode);
  const [origin, setOrigin] = useState<GeoCoordinate | null>(
    savedRoute?.origin ?? null,
  );
  const [routeRequested, setRouteRequested] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [startingNavigation, setStartingNavigation] = useState(false);
  const [retryingRoute, setRetryingRoute] = useState(false);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [mapBottomInset, setMapBottomInset] = useState(0);
  // Guards double taps before the `startingNavigation` render lands.
  const startInFlightRef = useRef(false);
  const startAttemptRef = useRef(0);
  const retryInFlightRef = useRef(false);
  const {
    message: locationMessage,
    requestLocation,
    status: locationStatus,
  } = useUserLocation();
  const follow = useNavigationFollow(navigationActive);

  const request = getRemoteRouteRequest({
    destination,
    mode,
    origin,
    requested: routeRequested,
    saved: savedRoute !== null,
  });
  const routeQuery = useCalculatedRoute(request);
  const isCalculating = request !== null && routeQuery.isFetching;
  const route = useNavigationRoute(
    savedRoute?.route ?? routeQuery.data ?? null,
    navigationActive,
  );
  const routeError = routeQuery.error
    ? getRouteErrorMessage(routeQuery.error)
    : null;

  const navigationSession = useNavigationSession({
    active: navigationActive,
    backgroundEnabled: backgroundTrackingEnabled,
    destination,
    isRecalculating: isCalculating,
    mode,
    onReroute: (nextOrigin) => {
      setOrigin(nextOrigin);
    },
    route,
    // One failed remote attempt keeps the current route without repeatedly
    // contacting an unavailable service as GPS positions change.
    reroutingEnabled: savedRoute === null && !routeQuery.isError,
  });

  // `blur` fires when another screen covers this one, never on a bare
  // unmount; leaving the screen ends an active navigation.
  useEffect(
    () =>
      navigation.addListener("blur", () => {
        startAttemptRef.current += 1;
        setNavigationActive(false);
      }),
    [navigation],
  );

  // Back cancels a start still waiting for GPS; active navigation uses its X.
  useScreenBackHandler(() => {
    if (startingNavigation) startAttemptRef.current += 1;
    return navigationActive;
  });

  useEffect(() => {
    if (
      savedRoute ||
      !destination ||
      origin ||
      routeRequested ||
      navigationActive
    )
      return;

    let cancelled = false;
    void requestLocation({ forceRefresh: true }).then((coordinate) => {
      if (cancelled || !coordinate) return;
      setOrigin(coordinate);
      setRouteRequested(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    destination,
    navigationActive,
    origin,
    requestLocation,
    routeRequested,
    savedRoute,
  ]);

  const closeRoute = () => {
    startAttemptRef.current += 1;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleCalculateRoute = async () => {
    if (savedRoute || !destination || isCalculating || navigationActive) return;

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

  /**
   * Asks for the permissions to keep following the route outside the app.
   * Any refusal only leaves the navigation in the foreground.
   */
  const enableBackgroundTracking = async (isCancelled: () => boolean) => {
    try {
      const permission = await requestNavigationBackgroundPermission();
      if (!permission.granted || isCancelled()) return;
      const notifications = await requestNavigationNotificationPermission();
      if (!notifications || isCancelled()) return;
      setBackgroundTrackingEnabled(true);
    } catch {
      setBackgroundTrackingEnabled(false);
    }
  };

  const handleStartNavigation = async () => {
    if (!destination || !route || isCalculating || navigationActive) return;
    if (startInFlightRef.current) return;

    if (auth.status !== "authenticated") {
      if (auth.status === "anonymous") {
        router.push(buildLoginHref("/route"));
      }
      return;
    }

    const attempt = ++startAttemptRef.current;
    const isCancelled = () =>
      attempt !== startAttemptRef.current || !navigation.isFocused();
    startInFlightRef.current = true;
    setStartingNavigation(true);
    try {
      const coordinate = await requestLocation({ forceRefresh: true });
      if (!coordinate || isCancelled()) return;
      await enableBackgroundTracking(isCancelled);
      if (isCancelled()) return;
      setNavigationActive(true);
    } finally {
      startInFlightRef.current = false;
      setStartingNavigation(false);
    }
  };

  const handleStopNavigation = () => {
    startAttemptRef.current += 1;
    setPreviewExpanded(true);
    setNavigationActive(false);
    setBackgroundTrackingEnabled(false);
  };

  const handleRetryNavigationRoute = async () => {
    if (
      savedRoute ||
      !destination ||
      !navigationActive ||
      isCalculating ||
      retryInFlightRef.current
    )
      return;
    retryInFlightRef.current = true;
    setRetryingRoute(true);
    const attempt = ++startAttemptRef.current;
    try {
      const coordinate = await requestLocation({ forceRefresh: true });
      if (
        !coordinate ||
        attempt !== startAttemptRef.current ||
        !navigation.isFocused()
      )
        return;
      if (
        origin?.latitude === coordinate.latitude &&
        origin.longitude === coordinate.longitude
      ) {
        await routeQuery.refetch();
      } else {
        setOrigin(coordinate);
      }
    } finally {
      retryInFlightRef.current = false;
      setRetryingRoute(false);
    }
  };

  const navigationNotice = savedRoute ? savedRouteNavigationNotice : routeError;

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
    <TourismGlassScope
      backdrop={
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
      }
      style={[styles.screen, { backgroundColor: colors.map.background }]}
    >
      <Stack.Screen
        options={{ gestureEnabled: !navigationActive, headerShown: false }}
      />
      {!navigationActive ? (
        <RoutePreviewPanel
          destinationName={destinationName}
          expanded={previewExpanded}
          isCalculating={isCalculating}
          locationMessage={
            locationStatus === "denied" ||
            locationStatus === "disabled" ||
            locationStatus === "error"
              ? locationMessage
              : null
          }
          locationRequesting={locationStatus === "requesting"}
          mode={mode}
          navigationNotice={navigationNotice}
          onCalculateRoute={() => void handleCalculateRoute()}
          onClose={closeRoute}
          onExpandedChange={setPreviewExpanded}
          onHeightChange={setMapBottomInset}
          onModeChange={setMode}
          onStartNavigation={() => void handleStartNavigation()}
          route={route}
          routeError={routeError}
          savedRoute={savedRoute !== null}
          startingNavigation={startingNavigation}
        />
      ) : route ? (
        <ActiveNavigationOverlay
          guidance={navigationSession.nextInstruction}
          isFollowing={follow.following}
          isRecalculating={isCalculating || retryingRoute}
          message={navigationSession.message}
          notice={navigationSession.backgroundNotice ?? navigationNotice}
          onBottomInsetChange={setMapBottomInset}
          onRecenter={() => follow.setFollowing(true)}
          onStop={handleStopNavigation}
          onRetryRoute={
            !savedRoute && routeQuery.isError
              ? () => void handleRetryNavigationRoute()
              : undefined
          }
          remainingDistanceMeters={navigationSession.remainingDistanceMeters}
          remainingDurationSeconds={navigationSession.remainingDurationSeconds}
          route={route}
        />
      ) : null}
    </TourismGlassScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
