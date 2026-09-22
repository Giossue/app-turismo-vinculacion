import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  TourismActionButton,
  TourismIconAction,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useCalculatedRoute } from "@/features/routing/application/use-calculated-route";
import { useNavigationSession } from "@/features/routing/application/use-navigation-session";
import {
  hasNavigationBackgroundPermission,
  requestNavigationNotificationPermission,
  requestNavigationBackgroundPermission,
  startNavigationLocationTask,
  stopNavigationLocationTask,
} from "@/features/routing/infrastructure/navigation-background-task";
import { clearNavigationSession } from "@/features/routing/data/navigation-session-storage";
import type { NavigationGuidance } from "@/features/routing/domain/navigation-guidance";
import type {
  CalculatedRoute,
  RouteCoordinate,
  RouteMode,
  RouteRequest,
} from "@/features/routing/domain/routing";
import { RouteMap } from "@/features/routing/presentation/route-map";

type RouteParams = Readonly<{
  destinationLatitude?: string | string[];
  destinationLongitude?: string | string[];
  destinationName?: string | string[];
  mode?: string | string[];
}>;

const modeOptions: readonly Readonly<{
  icon: TurismoIconName;
  label: string;
  mode: RouteMode;
}>[] = [
  { icon: "car", label: "Auto", mode: "car" },
  { icon: "bike", label: "Bicicleta", mode: "bicycle" },
  { icon: "foot", label: "A pie", mode: "foot" },
];
const navigationFollowDelayMs = 7_000;

export default function RouteScreen() {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const [mode, setMode] = useState<RouteMode>(
    () => parseRouteMode(firstParam(params.mode)) ?? "car",
  );
  const [origin, setOrigin] = useState<RouteCoordinate | null>(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [navigationFollowing, setNavigationFollowing] = useState(false);
  const navigationActiveRef = useRef(false);
  const navigationFollowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const navigationStartInFlightRef = useRef(false);
  const screenFocusedRef = useRef(false);
  const {
    message: locationMessage,
    requestLocation,
    setForegroundTrackingSuspended,
    status: locationStatus,
  } = useUserLocation();

  const destination = useMemo(
    () =>
      parseDestination(params.destinationLatitude, params.destinationLongitude),
    [params.destinationLatitude, params.destinationLongitude],
  );
  const destinationName = firstParam(params.destinationName) ?? "Destino";

  const clearNavigationFollowTimer = useCallback(() => {
    if (navigationFollowTimerRef.current === null) return;
    clearTimeout(navigationFollowTimerRef.current);
    navigationFollowTimerRef.current = null;
  }, []);

  const scheduleNavigationFollow = useCallback(() => {
    clearNavigationFollowTimer();
    navigationFollowTimerRef.current = setTimeout(() => {
      navigationFollowTimerRef.current = null;
      if (!navigationActiveRef.current) return;
      setNavigationFollowing(true);
      setRecenterKey((current) => current + 1);
    }, navigationFollowDelayMs);
  }, [clearNavigationFollowTimer]);

  const handleNavigationMapInteraction = useCallback(() => {
    if (!navigationActiveRef.current) return;
    setNavigationFollowing(false);
    scheduleNavigationFollow();
  }, [scheduleNavigationFollow]);

  const handleNavigationRecenter = useCallback(() => {
    if (!navigationActiveRef.current) return;
    clearNavigationFollowTimer();
    setNavigationFollowing(true);
    setRecenterKey((current) => current + 1);
  }, [clearNavigationFollowTimer]);

  const teardownNavigation = useCallback(() => {
    clearNavigationFollowTimer();
    navigationActiveRef.current = false;
    navigationStartInFlightRef.current = false;

    // Clear persisted state before the native task can publish another update
    // while the route screen is being removed.
    void clearNavigationSession();
    void stopNavigationLocationTask();
  }, [clearNavigationFollowTimer]);

  const finishNavigation = useCallback(
    (notice: string | null) => {
      clearNavigationFollowTimer();
      setNavigationFollowing(false);
      teardownNavigation();
      setNavigationActive(false);
      setNavigationNotice(notice);
    },
    [clearNavigationFollowTimer, teardownNavigation],
  );

  const handleRouteClose = useCallback(() => {
    if (navigationActiveRef.current || navigationStartInFlightRef.current) {
      return;
    }
    finishNavigation(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as never);
    }
  }, [finishNavigation, router]);

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;

      return () => {
        screenFocusedRef.current = false;
        if (
          !navigationActiveRef.current &&
          !navigationStartInFlightRef.current
        ) {
          return;
        }
        teardownNavigation();
      };
    }, [teardownNavigation]),
  );

  useScreenBackHandler(
    useCallback(() => {
      // Active navigation is a dedicated mode. It can only be left through
      // its explicit close action; Android back must not tear it down.
      return navigationActiveRef.current || navigationStartInFlightRef.current;
    }, []),
  );

  useEffect(() => {
    setForegroundTrackingSuspended(navigationActive);
  }, [navigationActive, setForegroundTrackingSuspended]);

  useEffect(
    () => () => {
      clearNavigationFollowTimer();
      setForegroundTrackingSuspended(false);
    },
    [clearNavigationFollowTimer, setForegroundTrackingSuspended],
  );

  const request = useMemo<RouteRequest | null>(() => {
    if (!routeRequested || !origin || !destination) return null;
    return { destination, mode, origin };
  }, [destination, mode, origin, routeRequested]);
  const routeQuery = useCalculatedRoute(request);
  const isCalculating = request !== null && routeQuery.isFetching;

  const handleArrive = useCallback(() => {
    setNavigationNotice("Has llegado a tu destino.");
  }, []);

  const handleReroute = useCallback((nextOrigin: RouteCoordinate) => {
    setNavigationNotice(null);
    setOrigin(nextOrigin);
  }, []);

  const navigationSession = useNavigationSession({
    active: navigationActive,
    destination,
    isRecalculating: isCalculating,
    mode,
    onArrive: handleArrive,
    onReroute: handleReroute,
    origin,
    route: routeQuery.data ?? null,
    voiceEnabled: true,
  });

  useEffect(() => {
    if (!destination || origin || routeRequested || navigationActive) return;

    let cancelled = false;
    const locationPromise = requestLocation({ forceRefresh: true });
    void locationPromise.then((coordinate) => {
      if (cancelled || !coordinate) return;
      setOrigin(coordinate);
      setRouteRequested(true);
    });

    return () => {
      cancelled = true;
    };
  }, [destination, navigationActive, origin, requestLocation, routeRequested]);

  const handleCalculateRoute = useCallback(async () => {
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
  }, [
    destination,
    isCalculating,
    navigationActive,
    origin,
    requestLocation,
    routeQuery,
  ]);

  const handleStartNavigation = useCallback(async () => {
    const calculatedRoute = routeQuery.data;
    if (!destination || !calculatedRoute || isCalculating || navigationActive) {
      return;
    }

    if (auth.status !== "authenticated") {
      if (auth.status === "anonymous") {
        finishNavigation(null);
        router.push({
          pathname: "/login",
          params: { returnTo: "/route" },
        } as never);
      }
      return;
    }

    if (!screenFocusedRef.current) return;
    navigationStartInFlightRef.current = true;

    try {
      const coordinate = await requestLocation({ forceRefresh: true });
      if (!coordinate || !screenFocusedRef.current) return;

      let nextNotice: string | null = null;
      let backgroundTrackingEnabled = false;
      if (Platform.OS !== "web") {
        backgroundTrackingEnabled = await hasNavigationBackgroundPermission();
        if (!screenFocusedRef.current) return;

        if (!backgroundTrackingEnabled) {
          const confirmed = await confirmBackgroundNavigation();
          if (!screenFocusedRef.current) return;
          if (confirmed) {
            const backgroundPermission =
              await requestNavigationBackgroundPermission();
            if (!screenFocusedRef.current) return;
            backgroundTrackingEnabled = backgroundPermission.granted;

            if (!backgroundTrackingEnabled) {
              nextNotice = backgroundPermission.canAskAgain
                ? "Navegación iniciada mientras la app está abierta. Para continuar al cambiar de aplicación, permite la ubicación en segundo plano."
                : "Navegación iniciada mientras la app está abierta. Para continuar al cambiar de aplicación, activa la ubicación en segundo plano desde Ajustes.";
            }
          } else {
            nextNotice =
              "Navegación iniciada mientras la app está abierta. Puedes activar el seguimiento al cambiar de aplicación desde Ajustes.";
          }
        }

        if (backgroundTrackingEnabled) {
          const notificationGranted =
            await requestNavigationNotificationPermission();
          if (!screenFocusedRef.current) return;
          if (!notificationGranted) {
            nextNotice =
              "La navegación seguirá activa, pero Android ocultará la notificación hasta que permitas las notificaciones en Ajustes.";
          }

          try {
            // Registra el servicio mientras la acción del usuario mantiene la app
            // en primer plano. El efecto de la sesión lo vuelve idempotente.
            await startNavigationLocationTask();
          } catch (error) {
            setNavigationNotice(
              error instanceof Error
                ? error.message
                : "No pudimos iniciar el seguimiento de ubicación.",
            );
            return;
          }
          if (!screenFocusedRef.current) return;
        }
      }

      setNavigationNotice(nextNotice);
      navigationActiveRef.current = true;
      setNavigationFollowing(true);
      clearNavigationFollowTimer();
      setRecenterKey((current) => current + 1);
      setNavigationActive(true);
    } finally {
      navigationStartInFlightRef.current = false;
    }
  }, [
    destination,
    isCalculating,
    navigationActive,
    requestLocation,
    auth.status,
    clearNavigationFollowTimer,
    finishNavigation,
    routeQuery.data,
    router,
  ]);

  const handleMapInteraction = useCallback(() => {
    if (!navigationActiveRef.current) setPreviewExpanded(false);
  }, []);

  const handleStopNavigation = useCallback(() => {
    setPreviewExpanded(true);
    finishNavigation(null);
  }, [finishNavigation]);

  const modeLabel =
    modeOptions.find((option) => option.mode === mode)?.label ?? "Auto";
  const routeError =
    routeQuery.error instanceof Error ? routeQuery.error.message : null;
  // La navegación solo dibuja una posición que haya pasado por su watcher
  // activo. No reutiliza el origen de la ruta ni la coordenada foreground de
  // antes de entrar al modo navegación mientras espera el primer punto fresco.
  const navigationMapLocation = navigationActive
    ? navigationSession.currentLocation
    : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.mapBackground }]}>
      <Stack.Screen
        options={{ gestureEnabled: !navigationActive, headerShown: false }}
      />
      {destination ? (
        <RouteMap
          currentLocation={navigationMapLocation}
          destination={destination}
          fullScreen
          navigationActive={navigationActive}
          onUserInteraction={
            navigationActive
              ? handleNavigationMapInteraction
              : handleMapInteraction
          }
          origin={origin}
          recenterKey={recenterKey}
          route={routeQuery.data ?? null}
        />
      ) : (
        <View
          style={[
            styles.mapPlaceholder,
            { backgroundColor: colors.background },
          ]}
        />
      )}
      {destination && !navigationActive ? (
        <RoutePreviewPanel
          key={`route-preview-${previewExpanded ? "expanded" : "collapsed"}`}
          destinationName={destinationName}
          expanded={previewExpanded}
          isCalculating={isCalculating}
          locationMessage={locationMessage}
          locationRequesting={locationStatus === "requesting"}
          mode={mode}
          modeLabel={modeLabel}
          navigationNotice={navigationNotice}
          onCalculateRoute={() => void handleCalculateRoute()}
          onClose={handleRouteClose}
          onExpandedChange={setPreviewExpanded}
          onModeChange={setMode}
          onStartNavigation={() => void handleStartNavigation()}
          route={routeQuery.data ?? null}
          routeError={routeError}
        />
      ) : null}
      {destination && navigationActive && routeQuery.data ? (
        <ActiveNavigationOverlay
          guidance={navigationSession.nextInstruction}
          isFollowing={navigationFollowing}
          isRecalculating={isCalculating}
          message={navigationSession.message}
          onRecenter={handleNavigationRecenter}
          onStop={handleStopNavigation}
          remainingDistanceMeters={navigationSession.remainingDistanceMeters}
          remainingDurationSeconds={navigationSession.remainingDurationSeconds}
          route={routeQuery.data}
          notice={navigationNotice ?? routeError}
        />
      ) : null}
    </View>
  );
}

const ROUTE_PANEL_SPRING = {
  damping: 30,
  mass: 0.8,
  overshootClamping: true,
  stiffness: 280,
} as const;
const ROUTE_PANEL_EXPAND_THRESHOLD = 0.34;
const ROUTE_PANEL_EXPAND_VELOCITY = 650;

type RoutePreviewPanelProps = Readonly<{
  destinationName: string;
  expanded: boolean;
  isCalculating: boolean;
  locationMessage: string | null;
  locationRequesting: boolean;
  mode: RouteMode;
  modeLabel: string;
  navigationNotice: string | null;
  onCalculateRoute: () => void;
  onClose: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onModeChange: (mode: RouteMode) => void;
  onStartNavigation: () => void;
  route: CalculatedRoute | null;
  routeError: string | null;
}>;

function RoutePreviewPanel({
  destinationName,
  expanded,
  isCalculating,
  locationMessage,
  locationRequesting,
  mode,
  modeLabel,
  navigationNotice,
  onCalculateRoute,
  onClose,
  onExpandedChange,
  onModeChange,
  onStartNavigation,
  route,
  routeError,
}: RoutePreviewPanelProps) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxExpandedHeight = Math.min(
    height * 0.72,
    height - insets.top - turismoSpacing.xxl,
  );
  const compactHeight = Math.min(
    maxExpandedHeight,
    turismoMetrics.controlLg * 3 +
      turismoSpacing.xxl +
      turismoSpacing.lg +
      insets.bottom,
  );
  const expandedHeight = Math.max(compactHeight, maxExpandedHeight);
  const panelHeight = useSharedValue(expanded ? expandedHeight : compactHeight);
  const dragStartHeight = useSharedValue(
    expanded ? expandedHeight : compactHeight,
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .enabled(!expanded)
    .onBegin(() => {
      dragStartHeight.value = panelHeight.value;
    })
    .onUpdate((event) => {
      const nextHeight = dragStartHeight.value - event.translationY;
      panelHeight.value = Math.max(
        compactHeight,
        Math.min(expandedHeight, nextHeight),
      );
    })
    .onEnd((event) => {
      const travel = expandedHeight - compactHeight;
      const progress =
        travel <= 0 ? 0 : (panelHeight.value - compactHeight) / travel;
      const shouldExpand =
        progress >= ROUTE_PANEL_EXPAND_THRESHOLD ||
        event.velocityY < -ROUTE_PANEL_EXPAND_VELOCITY;
      panelHeight.value = withSpring(
        shouldExpand ? expandedHeight : compactHeight,
        ROUTE_PANEL_SPRING,
      );
      runOnJS(onExpandedChange)(shouldExpand);
    });
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  return (
    <View pointerEvents="box-none" style={styles.routePreviewOverlay}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.routePreviewSurface,
            { backgroundColor: colors.surface, borderColor: colors.border },
            panelAnimatedStyle,
          ]}
        >
          <View style={styles.routePanelHeader}>
            <Pressable
              accessibilityLabel={
                expanded
                  ? "Contraer detalles de la ruta"
                  : "Expandir detalles de la ruta"
              }
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              hitSlop={turismoSpacing.xs}
              onPress={() => onExpandedChange(!expanded)}
              style={styles.routePanelHandleButton}
            >
              <View
                style={[
                  styles.routePanelHandle,
                  { backgroundColor: colors.border },
                ]}
              />
            </Pressable>
            <View style={styles.routePanelHeaderRow}>
              <View style={styles.routePanelTitleCopy}>
                <Text style={[styles.routePanelTitle, { color: colors.text }]}>
                  {formatModeTitle(modeLabel)}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.routePanelEyebrow,
                    { color: colors.textMuted },
                  ]}
                >
                  Ruta hacia {destinationName}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar ruta"
                accessibilityRole="button"
                hitSlop={turismoSpacing.xs}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.routePanelClose,
                  pressed && styles.routePanelClosePressed,
                ]}
              >
                <TurismoIcon
                  color={colors.text}
                  name="close"
                  size={turismoIconSizes.lg}
                />
              </Pressable>
            </View>
          </View>

          {expanded ? (
            <>
              <ScrollView
                contentContainerStyle={styles.panelContent}
                showsVerticalScrollIndicator={false}
                style={styles.routePanelScroll}
              >
                <View
                  style={[
                    styles.routeModeTabs,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  {modeOptions.map((option) => {
                    const selected = mode === option.mode;
                    return (
                      <Pressable
                        accessibilityLabel={`Modo ${option.label}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={option.mode}
                        onPress={() => onModeChange(option.mode)}
                        style={[
                          styles.routeModeTab,
                          selected && [
                            styles.routeModeTabSelected,
                            { borderBottomColor: colors.primary },
                          ],
                        ]}
                      >
                        <TurismoIcon
                          color={selected ? colors.primary : colors.textMuted}
                          name={option.icon}
                          size={turismoIconSizes.md}
                        />
                        <Text
                          style={[
                            styles.routeModeTabLabel,
                            {
                              color: selected
                                ? colors.primaryStrong
                                : colors.textMuted,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {!isCalculating ? (
                  <View style={styles.routeOverview}>
                    <Text
                      style={[
                        styles.routeOverviewValue,
                        { color: colors.text },
                      ]}
                    >
                      {route
                        ? `${formatDuration(route.durationSeconds)} (${formatDistance(route.distanceMeters)})`
                        : "Prepara tu ruta"}
                    </Text>
                    <Text
                      style={[
                        styles.routeOverviewMeta,
                        { color: colors.textMuted },
                      ]}
                    >
                      {route
                        ? "Ruta más rápida"
                        : "Calcula un trayecto desde tu ubicación"}
                    </Text>
                  </View>
                ) : null}

                {isCalculating ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text
                      style={[styles.noticeText, { color: colors.textMuted }]}
                    >
                      Buscando una ruta sin tráfico en tiempo real…
                    </Text>
                  </View>
                ) : null}

                {navigationNotice ||
                routeError ||
                (!route && locationMessage) ? (
                  <TourismSurface style={styles.noticeCard}>
                    <TurismoIcon
                      color={colors.danger}
                      name="circleHelp"
                      size={turismoIconSizes.md}
                    />
                    <Text
                      style={[styles.noticeText, { color: colors.textMuted }]}
                    >
                      {navigationNotice ?? routeError ?? locationMessage}
                    </Text>
                  </TourismSurface>
                ) : null}

                {route && !isCalculating ? (
                  <View style={styles.stepsSection}>
                    <Text
                      style={[styles.stepsSectionTitle, { color: colors.text }]}
                    >
                      Pasos
                    </Text>
                    <View style={styles.stepsList}>
                      <View style={styles.stepRow}>
                        <View
                          style={[
                            styles.stepIcon,
                            {
                              backgroundColor: colors.map.locationSoft,
                            },
                          ]}
                        >
                          <TurismoIcon
                            color={colors.map.location}
                            name="locate"
                            size={turismoIconSizes.sm}
                          />
                        </View>
                        <View style={styles.stepCopy}>
                          <Text
                            style={[
                              styles.stepInstruction,
                              { color: colors.text },
                            ]}
                          >
                            Tu ubicación
                          </Text>
                        </View>
                        {route.steps.length ? (
                          <View
                            style={[
                              styles.stepLine,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        ) : null}
                      </View>
                      {route.steps.length ? (
                        route.steps.map((step, index) => (
                          <View
                            key={`${step.instruction}-${index}`}
                            style={styles.stepRow}
                          >
                            <View
                              style={[
                                styles.stepIcon,
                                { backgroundColor: colors.primarySoft },
                              ]}
                            >
                              <TurismoIcon
                                color={colors.primaryStrong}
                                name={getRouteStepIcon(step)}
                                size={turismoIconSizes.sm}
                              />
                            </View>
                            <View style={styles.stepCopy}>
                              <Text
                                style={[
                                  styles.stepInstruction,
                                  { color: colors.text },
                                ]}
                              >
                                {step.instruction}
                              </Text>
                              <Text
                                style={[
                                  styles.stepDistance,
                                  { color: colors.textFaint },
                                ]}
                              >
                                {formatDistance(step.distanceMeters)}
                              </Text>
                            </View>
                            {index < route.steps.length - 1 ? (
                              <View
                                style={[
                                  styles.stepLine,
                                  { backgroundColor: colors.border },
                                ]}
                              />
                            ) : null}
                          </View>
                        ))
                      ) : (
                        <Text
                          style={[
                            styles.noticeText,
                            { color: colors.textMuted },
                          ]}
                        >
                          No hay indicaciones detalladas para este trayecto.
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
              {!isCalculating ? (
                <View
                  style={[
                    styles.routePanelFooter,
                    {
                      backgroundColor: colors.surface,
                      borderTopColor: colors.border,
                      paddingBottom: Math.max(insets.bottom, turismoSpacing.sm),
                    },
                  ]}
                >
                  {!route ? (
                    <TourismActionButton
                      disabled={locationRequesting}
                      icon={locationRequesting ? undefined : "navigation"}
                      label={
                        locationRequesting
                          ? "Obteniendo ubicación…"
                          : routeError
                            ? "Reintentar ruta"
                            : "Calcular ruta"
                      }
                      onPress={onCalculateRoute}
                      style={styles.routePanelAction}
                    />
                  ) : (
                    <TourismActionButton
                      icon="navigation"
                      label="Iniciar navegación"
                      onPress={onStartNavigation}
                      style={styles.routePanelAction}
                    />
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <View
              style={[
                styles.routeCompactContent,
                { paddingBottom: Math.max(insets.bottom, turismoSpacing.sm) },
              ]}
            >
              {isCalculating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text
                    style={[styles.noticeText, { color: colors.textMuted }]}
                  >
                    Calculando ruta…
                  </Text>
                </View>
              ) : route ? (
                <View style={styles.routeCompactSummary}>
                  <Text
                    style={[
                      styles.routeCompactValue,
                      { color: colors.primaryStrong },
                    ]}
                  >
                    {formatDuration(route.durationSeconds)}
                  </Text>
                  <Text
                    style={[
                      styles.routeCompactMeta,
                      { color: colors.textMuted },
                    ]}
                  >
                    {formatDistance(route.distanceMeters)} · {modeLabel}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                  {routeError ?? locationMessage ?? "Prepara tu ruta"}
                </Text>
              )}
              {!isCalculating && route ? (
                <TourismActionButton
                  icon="navigation"
                  label="Iniciar navegación"
                  onPress={onStartNavigation}
                />
              ) : !isCalculating ? (
                <TourismActionButton
                  disabled={locationRequesting}
                  icon={locationRequesting ? undefined : "navigation"}
                  label={
                    locationRequesting
                      ? "Obteniendo ubicación…"
                      : routeError
                        ? "Reintentar ruta"
                        : "Calcular ruta"
                  }
                  onPress={onCalculateRoute}
                />
              ) : null}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type ActiveNavigationOverlayProps = Readonly<{
  guidance: NavigationGuidance | null;
  isFollowing: boolean;
  isRecalculating: boolean;
  message: string | null;
  notice: string | null;
  onRecenter: () => void;
  onStop: () => void;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  route: CalculatedRoute;
}>;

function ActiveNavigationOverlay({
  guidance,
  isFollowing,
  isRecalculating,
  message,
  notice,
  onRecenter,
  onStop,
  remainingDistanceMeters,
  remainingDurationSeconds,
  route,
}: ActiveNavigationOverlayProps) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const [clock, setClock] = useState(() => Date.now());
  const firstStep = route.steps[0];
  const activeGuidance =
    guidance ??
    (firstStep
      ? {
          distanceMeters: firstStep.distanceMeters,
          instruction: firstStep.instruction,
          stepIndex: 0,
        }
      : null);
  const activeStep = activeGuidance
    ? (route.steps[activeGuidance.stepIndex] ?? firstStep)
    : firstStep;
  const nextStep = activeGuidance
    ? route.steps[activeGuidance.stepIndex + 1]
    : undefined;
  const remainingDistance =
    remainingDistanceMeters ?? Math.max(0, route.distanceMeters);
  const remainingDuration =
    remainingDurationSeconds ?? Math.max(0, route.durationSeconds);
  const instruction = isRecalculating
    ? "Recalculando ruta…"
    : (message ?? activeGuidance?.instruction ?? "Siguiendo tu ubicación…");

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View pointerEvents="box-none" style={styles.activeOverlay}>
      <View
        style={[
          styles.activeGuidanceCard,
          {
            backgroundColor: colors.primarySoft,
            borderColor: colors.primarySoft,
            top: insets.top + turismoSpacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.activeGuidanceIcon,
            { backgroundColor: colors.primary },
          ]}
        >
          <TurismoIcon
            color={colors.onPrimary}
            name={activeStep ? getRouteStepIcon(activeStep) : "navigation"}
            size={turismoIconSizes.lg}
          />
        </View>
        <View style={styles.activeGuidanceCopy}>
          <Text style={[styles.activeGuidanceText, { color: colors.text }]}>
            {instruction}
          </Text>
          {activeGuidance && !isRecalculating && !message ? (
            <Text
              style={[
                styles.activeGuidanceDistance,
                { color: colors.textMuted },
              ]}
            >
              En {formatDistance(activeGuidance.distanceMeters)}
            </Text>
          ) : null}
          {notice ? (
            <Text style={[styles.activeNotice, { color: colors.textMuted }]}>
              {notice}
            </Text>
          ) : null}
        </View>
      </View>

      {nextStep && !message ? (
        <View
          style={[
            styles.activeNextStep,
            {
              backgroundColor: colors.primary,
              borderRadius: turismoRadii.md,
              top: insets.top + 102,
            },
          ]}
        >
          <Text style={[styles.activeNextLabel, { color: colors.onPrimary }]}>
            Luego
          </Text>
          <Text style={[styles.activeNextText, { color: colors.onPrimary }]}>
            {nextStep.instruction}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.activeBottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, turismoSpacing.sm),
          },
        ]}
      >
        <TourismIconAction
          accessibilityLabel="Cerrar navegación"
          icon="close"
          onPress={onStop}
          style={{
            backgroundColor: colors.background,
            borderColor: colors.textFaint,
          }}
        />
        <View style={styles.activeSummary}>
          <Text
            style={[styles.activeSummaryValue, { color: colors.primaryStrong }]}
          >
            {formatDuration(remainingDuration)}
          </Text>
          <Text style={[styles.activeSummaryMeta, { color: colors.textMuted }]}>
            {formatDistance(remainingDistance)} ·{" "}
            {formatArrivalTime(clock, remainingDuration)}
          </Text>
        </View>
        <TourismIconAction
          accessibilityLabel={
            isFollowing
              ? "Siguiendo mi ubicación"
              : "Centrar y seguir mi ubicación"
          }
          icon="locate"
          onPress={onRecenter}
          selected={isFollowing}
          style={{
            backgroundColor: isFollowing ? colors.primary : colors.background,
            borderColor: isFollowing ? colors.primary : colors.textFaint,
          }}
        />
      </View>
    </View>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result?.trim() || undefined;
}

function parseRouteMode(value: string | undefined): RouteMode | null {
  if (value === "car" || value === "bicycle" || value === "foot") return value;
  return null;
}

function parseDestination(
  latitudeParam: string | string[] | undefined,
  longitudeParam: string | string[] | undefined,
): RouteCoordinate | null {
  const latitude = Number(firstParam(latitudeParam));
  const longitude = Number(firstParam(longitudeParam));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return null;
  return { latitude, longitude };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatModeTitle(modeLabel: string): string {
  if (modeLabel === "Auto") return "En automóvil";
  if (modeLabel === "Bicicleta") return "En bicicleta";
  return "A pie";
}

function getRouteStepIcon(
  step: CalculatedRoute["steps"][number],
): TurismoIconName {
  const maneuverType = step.maneuver.type.toLowerCase().replace(/[-_]/g, " ");
  const modifier = step.maneuver.modifier?.toLowerCase() ?? "";
  const turnsLeft = modifier.includes("left");
  const turnsRight = modifier.includes("right");
  const isSlightTurn = modifier.includes("slight");

  if (maneuverType === "arrive" || maneuverType === "destination") {
    return "flag";
  }
  if (maneuverType.includes("uturn") || maneuverType.includes("u turn")) {
    return turnsRight ? "redo" : "undo";
  }
  if (maneuverType.includes("roundabout") || maneuverType.includes("rotary")) {
    return "refresh";
  }
  if (turnsLeft) return isSlightTurn ? "cornerUpLeft" : "arrowLeft";
  if (turnsRight) return isSlightTurn ? "cornerUpRight" : "arrowRight";
  return "arrowUp";
}

function formatArrivalTime(now: number, durationSeconds: number): string {
  const arrival = new Date(now + Math.max(0, durationSeconds) * 1000);
  return arrival.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confirmBackgroundNavigation(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "¿Continuar la ruta al salir de la app?",
      "Turismo Vinculación puede mantener tu posición mientras cambias de aplicación o apagas la pantalla. Solo se activa durante esta navegación y se detiene al llegar o tocar Detener. Si eliges Ahora no, podrás navegar con la app abierta.",
      [
        {
          onPress: () => resolve(false),
          style: "cancel",
          text: "Ahora no",
        },
        {
          onPress: () => resolve(true),
          text: "Continuar",
        },
      ],
      { cancelable: false },
    );
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapPlaceholder: { flex: 1 },
  routePreviewOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },

  routePreviewSurface: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoMetrics.borderWidth,
    bottom: 0,
    elevation: 24,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
  },
  routePanelHeader: {
    gap: turismoSpacing.xs,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
    paddingBottom: turismoSpacing.sm,
  },
  routePanelHandleButton: {
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: turismoSpacing.xxs,
  },
  routePanelHandle: {
    alignSelf: "center",
    borderRadius: turismoRadii.pill,
    height: turismoSpacing.xxs,
    width: turismoSpacing.xxl,
  },
  routePanelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  routePanelTitleCopy: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  routePanelEyebrow: { ...turismoTypography.caption },
  routePanelTitle: { ...turismoTypography.title, flexShrink: 1 },
  routePanelClose: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  routePanelClosePressed: { opacity: 0.6 },
  routePanelScroll: { flex: 1 },
  routePanelFooter: {
    borderTopWidth: turismoMetrics.borderWidth,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  routePanelAction: { alignSelf: "stretch" },
  routeCompactContent: {
    gap: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  routeCompactSummary: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  routeCompactValue: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  routeCompactMeta: { ...turismoTypography.caption },
  panelContent: {
    gap: turismoSpacing.md,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
    paddingBottom: turismoSpacing.md,
  },
  routeModeTabs: {
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
  },
  routeModeTab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: turismoMetrics.borderWidthStrong,
    flex: 1,
    gap: turismoSpacing.xxs,
    justifyContent: "center",
    minHeight: turismoMetrics.controlLg,
    paddingVertical: turismoSpacing.xxs,
  },
  routeModeTabSelected: {},
  routeModeTabLabel: { ...turismoTypography.label },
  routeOverview: {
    gap: turismoSpacing.xxs,
    paddingVertical: turismoSpacing.xs,
  },
  routeOverviewValue: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  routeOverviewMeta: { ...turismoTypography.body },
  stepsSection: { gap: turismoSpacing.sm },
  stepsSectionTitle: { ...turismoTypography.heading },
  stepsList: { gap: turismoSpacing.xxs },
  activeOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  activeGuidanceCard: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    left: turismoSpacing.sm,
    minHeight: 80,
    padding: turismoSpacing.sm,
    position: "absolute",
    right: turismoSpacing.sm,
  },
  activeGuidanceIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },

  activeGuidanceCopy: {
    flex: 1,
    gap: turismoSpacing.xxs,
    minWidth: 0,
  },
  activeGuidanceText: {
    ...turismoTypography.heading,
    flexShrink: 1,
    minWidth: 0,
  },
  activeGuidanceDistance: {
    ...turismoTypography.caption,
  },
  activeNotice: {
    ...turismoTypography.caption,
  },
  activeNextStep: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    left: turismoSpacing.sm,
    maxWidth: "92%",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
    position: "absolute",
  },
  activeNextLabel: {
    ...turismoTypography.label,
  },
  activeNextText: {
    ...turismoTypography.label,
    flexShrink: 1,
    minWidth: 0,
  },
  activeBottomBar: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    left: 0,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
    position: "absolute",
    right: 0,
  },
  activeSummary: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.xxs,
  },
  activeSummaryValue: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  activeSummaryMeta: {
    ...turismoTypography.body,
  },

  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 58,
    minWidth: 0,
    position: "relative",
  },
  stepIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  stepCopy: {
    flex: 1,
    gap: turismoSpacing.xxs,
    minWidth: 0,
    paddingTop: turismoSpacing.xxs,
  },
  stepInstruction: {
    ...turismoTypography.body,
    flexShrink: 1,
    minWidth: 0,
  },
  stepDistance: { ...turismoTypography.caption, flexShrink: 1, minWidth: 0 },
  stepLine: {
    bottom: -turismoSpacing.xxs,
    left: (turismoMetrics.controlSm - turismoMetrics.borderWidthStrong) / 2,
    position: "absolute",
    top: turismoMetrics.controlSm,
    width: turismoMetrics.borderWidthStrong,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.xs,
  },
  noticeCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  noticeText: { ...turismoTypography.caption, flex: 1 },
});
