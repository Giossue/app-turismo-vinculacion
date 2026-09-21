import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import ExpoBottomSheet, {
  BottomSheetScrollView,
} from "@expo/ui/community/bottom-sheet";

import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  TourismActionButton,
  TourismChoiceChip,
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

export default function RouteScreen() {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const [mode, setMode] = useState<RouteMode>("car");
  const [origin, setOrigin] = useState<RouteCoordinate | null>(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [routeSheetGeneration, setRouteSheetGeneration] = useState(0);
  const navigationActiveRef = useRef(false);
  const navigationStartInFlightRef = useRef(false);
  const pendingLoginAfterCloseRef = useRef(false);
  const screenFocusedRef = useRef(false);
  const routeSheetRef = useRef<ExpoBottomSheet>(null);
  const routeSheetGenerationRef = useRef(0);
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

  const teardownNavigation = useCallback(() => {
    navigationActiveRef.current = false;
    navigationStartInFlightRef.current = false;

    // Clear persisted state before the native task can publish another update
    // while the route screen is being removed.
    void clearNavigationSession();
    void stopNavigationLocationTask();
  }, []);

  const finishNavigation = useCallback(
    (notice: string | null) => {
      teardownNavigation();
      setNavigationActive(false);
      setNavigationNotice(notice);
    },
    [teardownNavigation],
  );

  const handleRouteSheetClose = useCallback((sheetGeneration: number) => {
    // The preview sheet is unmounted when navigation starts. A native close
    // callback from that old instance must not pop the route screen after the
    // user later returns from active navigation.
    if (
      navigationActiveRef.current ||
      sheetGeneration !== routeSheetGenerationRef.current
    ) {
      return;
    }
    finishNavigation(null);
    if (pendingLoginAfterCloseRef.current) {
      pendingLoginAfterCloseRef.current = false;
      router.push({
        pathname: "/login",
        params: { returnTo: "/route" },
      } as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as never);
    }
  }, [finishNavigation, router]);

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      routeSheetRef.current?.present();

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
    if (!navigationActive && screenFocusedRef.current) {
      routeSheetRef.current?.present();
    }
  }, [navigationActive]);

  useEffect(() => {
    setForegroundTrackingSuspended(navigationActive);
  }, [navigationActive, setForegroundTrackingSuspended]);

  useEffect(
    () => () => setForegroundTrackingSuspended(false),
    [setForegroundTrackingSuspended],
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
    void requestLocation().then((coordinate) => {
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

    const coordinate = await requestLocation();
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
        pendingLoginAfterCloseRef.current = true;
        routeSheetRef.current?.close();
      }
      return;
    }

    if (!screenFocusedRef.current) return;
    navigationStartInFlightRef.current = true;

    try {
      const coordinate = await requestLocation();
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
      const nextSheetGeneration = routeSheetGenerationRef.current + 1;
      routeSheetGenerationRef.current = nextSheetGeneration;
      setRouteSheetGeneration(nextSheetGeneration);
      navigationActiveRef.current = true;
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
    routeQuery.data,
  ]);

  const handleStopNavigation = useCallback(
    () => finishNavigation(null),
    [finishNavigation],
  );

  const modeLabel =
    modeOptions.find((option) => option.mode === mode)?.label ?? "Auto";
  const routeError =
    routeQuery.error instanceof Error ? routeQuery.error.message : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.mapBackground }]}>
      <Stack.Screen
        options={{ gestureEnabled: !navigationActive, headerShown: false }}
      />
      {destination ? (
        <RouteMap
          currentLocation={navigationSession.currentLocation}
          destination={destination}
          fullScreen
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
        <ExpoBottomSheet
          backgroundStyle={{ backgroundColor: colors.surface }}
          enablePanDownToClose
          handleComponent={null}
          index={0}
          key={`route-preview-${routeSheetGeneration}`}
          onClose={() => handleRouteSheetClose(routeSheetGeneration)}
          ref={routeSheetRef}
          snapPoints={["38%", "84%"]}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.panelContent}
            key="route-preview"
            showsVerticalScrollIndicator={false}
          >
            <TourismSurface style={styles.modeCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Modo de transporte
              </Text>
              <View style={styles.modeOptions}>
                {modeOptions.map((option) => (
                  <View key={option.mode} style={styles.modeOption}>
                    <TurismoIcon
                      color={
                        mode === option.mode
                          ? colors.primaryStrong
                          : colors.textMuted
                      }
                      name={option.icon}
                      size={turismoIconSizes.md}
                    />
                    <TourismChoiceChip
                      label={option.label}
                      onPress={() => setMode(option.mode)}
                      selected={mode === option.mode}
                    />
                  </View>
                ))}
              </View>
            </TourismSurface>

            {destination && !routeQuery.data ? (
              <TourismActionButton
                disabled={isCalculating || locationStatus === "requesting"}
                icon={
                  isCalculating || locationStatus === "requesting"
                    ? undefined
                    : "navigation"
                }
                label={
                  isCalculating
                    ? "Calculando ruta…"
                    : locationStatus === "requesting"
                      ? "Obteniendo ubicación…"
                      : routeQuery.isError
                        ? "Reintentar ruta"
                        : "Calcular ruta"
                }
                onPress={() => void handleCalculateRoute()}
              />
            ) : null}

            {routeQuery.data && !isCalculating ? (
              <TourismActionButton
                icon="navigation"
                label="Iniciar navegación"
                onPress={() => void handleStartNavigation()}
              />
            ) : null}

            {isCalculating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                  Buscando una ruta sin tráfico en tiempo real…
                </Text>
              </View>
            ) : null}

            {navigationNotice || locationMessage || routeError ? (
              <TourismSurface style={styles.noticeCard}>
                <TurismoIcon
                  color={colors.danger}
                  name="circleHelp"
                  size={turismoIconSizes.md}
                />
                <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                  {navigationNotice ?? routeError ?? locationMessage}
                </Text>
              </TourismSurface>
            ) : null}

            {routeQuery.data ? (
              <>
                <View style={styles.metrics}>
                  <Metric
                    label="Tiempo estimado"
                    value={formatDuration(routeQuery.data.durationSeconds)}
                  />
                  <Metric
                    label="Distancia"
                    value={formatDistance(routeQuery.data.distanceMeters)}
                  />
                  <Metric label="Modo" value={modeLabel} />
                </View>
                <TourismSurface style={styles.stepsCard}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Indicaciones
                  </Text>
                  {routeQuery.data.steps.length ? (
                    routeQuery.data.steps.map((step, index) => (
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
                            name={index === 0 ? "locate" : "navigation"}
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
                        {index < routeQuery.data.steps.length - 1 ? (
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
                      style={[styles.noticeText, { color: colors.textMuted }]}
                    >
                      No hay indicaciones detalladas para este trayecto.
                    </Text>
                  )}
                </TourismSurface>
              </>
            ) : null}
          </BottomSheetScrollView>
        </ExpoBottomSheet>
      ) : null}
      {destination && navigationActive && routeQuery.data ? (
        <ActiveNavigationOverlay
          guidance={navigationSession.nextInstruction}
          isRecalculating={isCalculating}
          message={navigationSession.message}
          onRecenter={() => setRecenterKey((current) => current + 1)}
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

type ActiveNavigationOverlayProps = Readonly<{
  guidance: NavigationGuidance | null;
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
            borderColor: colors.primary,
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
            name="navigation"
            size={turismoIconSizes.lg}
          />
        </View>
        <View style={styles.activeGuidanceCopy}>
          <Text
            numberOfLines={2}
            style={[styles.activeGuidanceText, { color: colors.text }]}
          >
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
            <Text
              numberOfLines={2}
              style={[styles.activeNotice, { color: colors.textMuted }]}
            >
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
              top: insets.top + 102,
            },
          ]}
        >
          <Text style={[styles.activeNextLabel, { color: colors.onPrimary }]}>
            Luego
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.activeNextText, { color: colors.onPrimary }]}
          >
            {nextStep.instruction}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.activeRecenter,
          {
            bottom:
              insets.bottom + turismoMetrics.controlMd + turismoSpacing.lg,
          },
        ]}
      >
        <TourismIconAction
          accessibilityLabel="Centrar en mi ubicación"
          icon="locate"
          onPress={onRecenter}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        />
      </View>

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
        <View style={styles.activeSummarySpacer} />
      </View>
    </View>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result?.trim() || undefined;
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
  panelContent: {
    gap: turismoSpacing.lg,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
  },
  modeCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  modeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
  },
  modeOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
  },
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
  },
  activeGuidanceText: {
    ...turismoTypography.heading,
  },
  activeGuidanceDistance: {
    ...turismoTypography.caption,
  },
  activeNotice: {
    ...turismoTypography.caption,
  },
  activeNextStep: {
    alignItems: "center",
    borderBottomRightRadius: turismoRadii.md,
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
    ...turismoTypography.caption,
    flexShrink: 1,
  },
  activeRecenter: {
    left: turismoSpacing.md,
    position: "absolute",
  },
  activeBottomBar: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
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
  activeSummarySpacer: {
    height: turismoMetrics.controlMd,
    width: turismoMetrics.controlMd,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
  metric: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    gap: turismoSpacing.xxs,
    minWidth: 96,
    padding: turismoSpacing.sm,
  },
  metricValue: { ...turismoTypography.heading },
  metricLabel: { ...turismoTypography.caption },
  sectionTitle: { ...turismoTypography.heading },
  stepsCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  stepRow: {
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 58,
    position: "relative",
  },
  stepIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  stepCopy: { flex: 1, gap: turismoSpacing.xxs },
  stepInstruction: { ...turismoTypography.body },
  stepDistance: { ...turismoTypography.caption },
  stepLine: {
    bottom: -turismoSpacing.sm,
    left: turismoMetrics.controlSm / 2,
    position: "absolute",
    top: 34,
    width: 1,
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
