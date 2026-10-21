import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import type { GeoCoordinate } from "@/core/geo/types";
import { useUserLocation } from "@/core/location/use-user-location";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { useBackgroundTrackingPreference } from "@/features/routing/application/use-background-tracking-preference";
import { useCalculatedRoute } from "@/features/routing/application/use-calculated-route";
import { useNavigationFollow } from "@/features/routing/application/use-navigation-follow";
import { useNavigationRoute } from "@/features/routing/application/use-navigation-route";
import { useNavigationRouteRetry } from "@/features/routing/application/use-navigation-route-retry";
import { useNavigationSession } from "@/features/routing/application/use-navigation-session";
import { useRouteNavigationControls } from "@/features/routing/application/use-route-navigation-controls";
import { useRouteScreenParams } from "@/features/routing/application/use-route-screen-params";
import { useSavedCalculatedRoute } from "@/features/routing/application/use-saved-routes";
import { getRouteErrorMessage } from "@/features/routing/data/routing-api";
import {
  describeSavedRouteError,
  type SavedCalculatedRoute,
} from "@/features/routing/data/saved-routes-storage";
import {
  getRemoteRouteRequest,
  getSavedRouteNavigationNotice,
} from "@/features/routing/domain/route-source";
import {
  getNextStopNotice,
  type RouteWaypoint,
} from "@/features/routing/domain/route-stops";
import type { RouteMode } from "@/features/routing/domain/routing";
import { ActiveNavigationOverlay } from "@/features/routing/presentation/active-navigation-overlay";
import { RouteMap } from "@/features/routing/presentation/route-map";
import { RoutePreviewPanel } from "@/features/routing/presentation/route-preview-panel";
import type { ParsedRouteSearchParams } from "@/features/routing/presentation/route-href";
import { useMessages } from "@/core/i18n/use-language";

/** Load a chosen saved route before mounting anything that can request GPS. */
export default function RouteScreen() {
  const m = useMessages();
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
      <TourismScreenFrame onBack={close} title={m.routing.screen.savedTitle}>
        <TourismStateView
          actionIcon="user"
          actionLabel={m.routing.screen.signIn}
          icon="navigation"
          message={m.routing.screen.savedSignIn}
          onAction={() => router.push(buildLoginHref("/route"))}
          variant="empty"
        />
      </TourismScreenFrame>
    );
  }
  if (auth.status === "loading" || savedQuery.isPending) {
    return (
      <TourismScreenFrame onBack={close} title={m.routing.screen.savedTitle}>
        <TourismStateView
          message={m.routing.screen.savedOpening}
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }
  if (!savedQuery.data) {
    return (
      <TourismScreenFrame onBack={close} title={m.routing.screen.savedTitle}>
        <TourismStateView
          icon="navigation"
          message={
            savedQuery.error
              ? describeSavedRouteError(savedQuery.error)
              : m.routing.screen.savedMissing
          }
          onAction={
            savedQuery.error ? () => void savedQuery.refetch() : undefined
          }
          title={m.routing.screen.savedOpenFailed}
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
  const m = useMessages();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const router = useRouter();
  const destination = savedRoute?.destination ?? params.destination;
  const destinationName = savedRoute?.destinationName ?? params.destinationName;
  const initialMode = savedRoute?.mode ?? params.mode;
  // Una ruta guardada conserva su trazado; las paradas solo vienen del enlace.
  const waypoints = savedRoute ? noWaypoints : params.waypoints;
  // `reached`: paradas ya alcanzadas. `requestedFrom`: primera parada que
  // incluye la ruta pedida; al recalcular se piden solo las pendientes.
  const [tripProgress, setTripProgress] = useState({
    reached: 0,
    requestedFrom: 0,
  });
  const pendingWaypoints = waypoints.slice(tripProgress.reached);
  const [mode, setMode] = useState<RouteMode>(initialMode);
  const [origin, setOrigin] = useState<GeoCoordinate | null>(
    savedRoute?.origin ?? null,
  );
  const [routeRequested, setRouteRequested] = useState(false);
  // Persisted opt-in: only when on are background permissions requested.
  const backgroundPreference = useBackgroundTrackingPreference();
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [mapBottomInset, setMapBottomInset] = useState(0);
  const {
    accuracy: locationAccuracy,
    message: locationMessage,
    requestLocation,
    status: locationStatus,
  } = useUserLocation();
  const controls = useRouteNavigationControls({
    backgroundPreference,
    locationAccuracy,
    onStopped: () => setPreviewExpanded(true),
    requestLocation,
  });
  const { navigationActive } = controls;
  const startRouteFrom = (coordinate: GeoCoordinate) => {
    setOrigin(coordinate);
    setTripProgress((progress) => ({
      ...progress,
      requestedFrom: progress.reached,
    }));
  };
  const follow = useNavigationFollow(navigationActive);

  const request = getRemoteRouteRequest({
    destination,
    mode,
    origin,
    requested: routeRequested,
    saved: savedRoute !== null,
    waypoints: waypoints.slice(tripProgress.requestedFrom),
  });
  const routeQuery = useCalculatedRoute(request);
  const isCalculating = request !== null && routeQuery.isFetching;
  const route = useNavigationRoute(
    savedRoute?.route ?? routeQuery.data ?? null,
    navigationActive,
  );
  const routeError =
    routeQuery.isPaused && !routeQuery.data
      ? m.routing.screen.offline
      : routeQuery.error
        ? getRouteErrorMessage(routeQuery.error)
        : null;

  const navigationSession = useNavigationSession({
    active: navigationActive,
    backgroundEnabled: controls.backgroundTrackingEnabled,
    destination,
    isRecalculating: isCalculating,
    mode,
    onReroute: startRouteFrom,
    onStopReached: () =>
      setTripProgress((progress) => ({
        ...progress,
        reached: progress.reached + 1,
      })),
    waypoints,
    arrivalArmed: pendingWaypoints.length === 0,
    route,
    // One failed remote attempt keeps the current route without repeatedly
    // contacting an unavailable service as GPS positions change.
    reroutingEnabled: savedRoute === null && !routeQuery.isError,
    initialLocation: controls.startLocation,
  });
  const routeRetry = useNavigationRouteRetry({
    beginAttempt: controls.beginAttempt,
    enabled:
      !savedRoute && destination !== null && navigationActive && !isCalculating,
    origin,
    refetch: routeQuery.refetch,
    requestLocation,
    setOrigin: startRouteFrom,
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
    controls.cancelPending();
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

  const navigationNotice = savedRoute
    ? getSavedRouteNavigationNotice()
    : routeError;
  const authLoading = auth.status === "loading";

  if (!destination) {
    return (
      <TourismScreenFrame onBack={closeRoute} title={m.routing.screen.title}>
        <TourismStateView
          icon="mapPin"
          message={m.routing.screen.missingDestination}
          title={m.routing.screen.missingDestinationTitle}
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
          bottomInset={mapBottomInset}
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
          waypoints={pendingWaypoints}
        />
      }
      style={[styles.screen, { backgroundColor: colors.map.background }]}
    >
      <Stack.Screen
        options={{ gestureEnabled: !navigationActive, headerShown: false }}
      />
      {!navigationActive ? (
        <RoutePreviewPanel
          backgroundTrackingEnabled={backgroundPreference.optedIn}
          backgroundTrackingNotice={backgroundPreference.notice}
          destination={destination}
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
          onBackgroundTrackingChange={backgroundPreference.setOptedIn}
          onModeChange={setMode}
          onStartNavigation={() =>
            void controls.start(
              destination !== null && route !== null && !isCalculating,
            )
          }
          route={route}
          routeError={routeError}
          savedRoute={savedRoute !== null}
          startDisabled={authLoading}
          startingNavigation={controls.startingNavigation}
          stopNames={pendingWaypoints.map((stop) => stop.name)}
        />
      ) : route ? (
        <ActiveNavigationOverlay
          guidance={navigationSession.nextInstruction}
          isFollowing={follow.following}
          arrivalPoint={{ coordinate: destination, name: destinationName }}
          arrived={navigationSession.arrived}
          isRecalculating={isCalculating || routeRetry.retrying}
          message={navigationSession.message}
          notice={
            navigationSession.backgroundNotice ??
            backgroundPreference.notice ??
            navigationNotice ??
            getNextStopNotice(pendingWaypoints, waypoints.length)
          }
          onBottomInsetChange={setMapBottomInset}
          onRecenter={() => follow.setFollowing(true)}
          onOpenPlace={(href) => {
            controls.stop();
            router.push(href);
          }}
          onStop={controls.stop}
          onRetryRoute={
            !savedRoute && routeQuery.isError
              ? () => void routeRetry.retry()
              : undefined
          }
          place={savedRoute ? null : params.place}
          remainingDistanceMeters={navigationSession.remainingDistanceMeters}
          remainingDurationSeconds={navigationSession.remainingDurationSeconds}
          route={route}
        />
      ) : null}
    </TourismGlassScope>
  );
}

const noWaypoints: readonly RouteWaypoint[] = [];

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
