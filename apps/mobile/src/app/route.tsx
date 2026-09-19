import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useUserLocation } from "@/core/location/use-user-location";
import {
  TourismActionButton,
  TourismBadge,
  TourismChoiceChip,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismMenuDrawer } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useCalculatedRoute } from "@/features/routing/application/use-calculated-route";
import {
  useNavigationSession,
  type NavigationSessionStatus,
} from "@/features/routing/application/use-navigation-session";
import type {
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
  const router = useRouter();
  const colors = useTurismoPalette();
  const params = useLocalSearchParams<RouteParams>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [mode, setMode] = useState<RouteMode>("car");
  const [origin, setOrigin] = useState<RouteCoordinate | null>(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const {
    message: locationMessage,
    requestLocation,
    status: locationStatus,
  } = useUserLocation();

  const destination = useMemo(
    () =>
      parseDestination(params.destinationLatitude, params.destinationLongitude),
    [params.destinationLatitude, params.destinationLongitude],
  );
  const destinationName =
    firstParam(params.destinationName) ?? "Destino seleccionado";
  const request = useMemo<RouteRequest | null>(() => {
    if (!routeRequested || !origin || !destination) return null;
    return { destination, mode, origin };
  }, [destination, mode, origin, routeRequested]);
  const routeQuery = useCalculatedRoute(request);
  const isCalculating = routeQuery.isPending || routeQuery.isFetching;

  const handleArrive = useCallback(() => {
    setNavigationActive(false);
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
    onArrive: handleArrive,
    onReroute: handleReroute,
    route: routeQuery.data ?? null,
    voiceEnabled,
  });

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    setMenuVisible(false);
    return true;
  }, [menuVisible]);

  useScreenBackHandler(handleBeforeBack);

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
    if (!destination || !routeQuery.data || isCalculating || navigationActive) {
      return;
    }

    const coordinate = await requestLocation();
    if (!coordinate) return;
    setNavigationNotice(null);
    setOrigin(coordinate);
    setNavigationActive(true);
  }, [
    destination,
    isCalculating,
    navigationActive,
    requestLocation,
    routeQuery.data,
  ]);

  const handleStopNavigation = useCallback(() => {
    setNavigationActive(false);
    setNavigationNotice(null);
  }, []);

  const modeLabel =
    modeOptions.find((option) => option.mode === mode)?.label ?? "Auto";
  const routeError =
    routeQuery.error instanceof Error ? routeQuery.error.message : null;

  return (
    <TourismScreenFrame
      onBack={() => router.back()}
      onMenu={() => setMenuVisible(true)}
      subtitle="NAVEGACIÓN"
      title="Cómo llegar"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.routeSummary}>
          <View
            style={[styles.routeIcon, { backgroundColor: colors.primarySoft }]}
          >
            <TurismoIcon
              color={colors.primaryStrong}
              name="mapPinned"
              size={turismoIconSizes.lg}
            />
          </View>
          <View style={styles.routeCopy}>
            <Text style={[styles.routeTitle, { color: colors.text }]}>
              {destinationName}
            </Text>
            <Text style={[styles.routeMeta, { color: colors.textMuted }]}>
              {destination
                ? `Desde tu ubicación · ${modeLabel.toLowerCase()}`
                : "Abre Cómo llegar desde un atractivo publicado"}
            </Text>
          </View>
          <TourismBadge>{modeLabel}</TourismBadge>
        </TourismSurface>

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
                  disabled={navigationActive}
                  label={option.label}
                  onPress={() => setMode(option.mode)}
                  selected={mode === option.mode}
                />
              </View>
            ))}
          </View>
        </TourismSurface>

        {destination && origin ? (
          <RouteMap
            currentLocation={navigationSession.currentLocation}
            destination={destination}
            origin={origin}
            route={routeQuery.data ?? null}
          />
        ) : null}

        <TourismActionButton
          disabled={!destination || isCalculating || navigationActive}
          icon={isCalculating || navigationActive ? undefined : "navigation"}
          label={
            navigationActive
              ? "Navegación activa"
              : isCalculating
                ? "Calculando ruta…"
                : routeQuery.data
                  ? "Recalcular ruta"
                  : "Calcular ruta"
          }
          onPress={() => void handleCalculateRoute()}
        />

        {routeQuery.data && !navigationActive && !isCalculating ? (
          <TourismActionButton
            icon="navigation"
            label="Iniciar navegación"
            onPress={() => void handleStartNavigation()}
          />
        ) : null}

        {navigationActive ? (
          <TourismSurface style={styles.navigationCard}>
            <View style={styles.navigationHeader}>
              <View
                style={[
                  styles.navigationIcon,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="navigation"
                  size={turismoIconSizes.md}
                />
              </View>
              <View style={styles.navigationCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isCalculating
                    ? "Recalculando ruta"
                    : navigationStatusLabel(navigationSession.status)}
                </Text>
                <Text
                  style={[styles.navigationInstruction, { color: colors.text }]}
                >
                  {navigationSession.nextInstruction?.instruction ??
                    navigationSession.message ??
                    "Siguiendo tu ubicación…"}
                </Text>
                {navigationSession.nextInstruction ? (
                  <Text
                    style={[styles.stepDistance, { color: colors.textFaint }]}
                  >
                    En{" "}
                    {formatDistance(
                      navigationSession.nextInstruction.distanceMeters,
                    )}
                  </Text>
                ) : null}
              </View>
              {isCalculating || navigationSession.status === "starting" ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
            </View>
            <View style={styles.navigationActions}>
              <TourismActionButton
                compact
                label={voiceEnabled ? "Silenciar voz" : "Activar voz"}
                mode="outlined"
                onPress={() => setVoiceEnabled((current) => !current)}
                style={styles.navigationAction}
              />
              <TourismActionButton
                compact
                icon="close"
                label="Detener"
                mode="outlined"
                onPress={handleStopNavigation}
                style={styles.navigationAction}
              />
            </View>
          </TourismSurface>
        ) : null}

        {isCalculating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              {navigationActive
                ? "Recalculando tu ruta…"
                : "Buscando una ruta sin tráfico en tiempo real…"}
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
                        style={[styles.stepInstruction, { color: colors.text }]}
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
                <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                  No hay indicaciones detalladas para este trayecto.
                </Text>
              )}
            </TourismSurface>
          </>
        ) : destination && locationStatus === "idle" ? (
          <TourismSurface style={styles.noticeCard}>
            <TurismoIcon
              color={colors.primaryStrong}
              name="circleHelp"
              size={turismoIconSizes.md}
            />
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              Pulsa “Calcular ruta” para solicitar tu ubicación y buscar el
              trayecto hasta este atractivo.
            </Text>
          </TourismSurface>
        ) : null}

        <TourismActionButton
          icon="arrowLeft"
          label="Volver al mapa"
          mode="outlined"
          onPress={() => router.back()}
        />
      </ScrollView>
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onItinerary={() => {
          setMenuVisible(false);
          router.replace("/itinerary" as never);
        }}
        onOfflineMaps={() => {
          setMenuVisible(false);
          router.push("/offline" as never);
        }}
        onSettings={() => {
          setMenuVisible(false);
          router.push("/settings" as never);
        }}
        onSaved={() => setMenuVisible(false)}
        visible={menuVisible}
      />
    </TourismScreenFrame>
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

function navigationStatusLabel(status: NavigationSessionStatus): string {
  switch (status) {
    case "starting":
      return "Preparando navegación";
    case "tracking":
      return "Navegación activa";
    case "rerouting":
      return "Buscando una nueva ruta";
    case "arrived":
      return "Llegaste al destino";
    case "denied":
      return "Ubicación no disponible";
    case "disabled":
      return "GPS desactivado";
    case "error":
      return "No se pudo seguir la ruta";
    case "idle":
    default:
      return "Navegación activa";
  }
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
  },
  routeSummary: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  routeIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  routeCopy: { flex: 1, gap: turismoSpacing.xxs },
  routeTitle: { ...turismoTypography.heading },
  routeMeta: { ...turismoTypography.caption },
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
  navigationCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  navigationHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  navigationIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  navigationCopy: { flex: 1, gap: turismoSpacing.xxs },
  navigationInstruction: { ...turismoTypography.body },
  navigationActions: { flexDirection: "row", gap: turismoSpacing.xs },
  navigationAction: { flex: 1 },
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
