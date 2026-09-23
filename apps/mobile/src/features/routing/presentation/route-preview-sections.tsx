import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { formatDistance } from "@/core/format/distance";
import { formatDurationSeconds } from "@/core/format/duration";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismSectionTitle,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismTabs } from "@/core/ui/tourism-tabs";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetricTypography,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import { routeModeOptions } from "./route-mode-options";
import { getRouteStepIcon } from "./route-step-icon";

/** Rows keep room for two lines of instruction next to the step icon. */
const stepRowMinHeight = turismoMetrics.controlSm + turismoSpacing.md;

export function RouteModeTabs({
  mode,
  onChange,
}: Readonly<{ mode: RouteMode; onChange: (mode: RouteMode) => void }>) {
  return (
    <TourismTabs fill items={routeModeOptions} onChange={onChange} value={mode} />
  );
}

export function RouteOverview({
  route,
}: Readonly<{ route: CalculatedRoute | null }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.overview}>
      <Text style={[styles.metric, { color: colors.text }]}>
        {route
          ? `${formatDurationSeconds(route.durationSeconds)} (${formatDistance(route.distanceMeters)})`
          : "Prepara tu ruta"}
      </Text>
      <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
        {route ? "Ruta más rápida" : "Calcula un trayecto desde tu ubicación"}
      </Text>
    </View>
  );
}

/** Compact duration, distance and mode shown by the collapsed panel. */
export function RouteCompactSummary({
  modeLabel,
  route,
}: Readonly<{ modeLabel: string; route: CalculatedRoute }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.compactSummary}>
      <Text style={[styles.metric, { color: colors.primaryStrong }]}>
        {formatDurationSeconds(route.durationSeconds)}
      </Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {formatDistance(route.distanceMeters)} · {modeLabel}
      </Text>
    </View>
  );
}

/** Location, route or navigation problem the tourist needs to know about. */
export function RouteNotice({ message }: Readonly<{ message: string }>) {
  const colors = useTurismoPalette();
  return (
    <TourismSurface style={styles.noticeCard}>
      <TurismoIcon
        color={colors.danger}
        name="circleHelp"
        size={turismoIconSizes.md}
      />
      <Text
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.noticeText, { color: colors.textMuted }]}
      >
        {message}
      </Text>
    </TourismSurface>
  );
}

export function RouteSteps({ route }: Readonly<{ route: CalculatedRoute }>) {
  const colors = useTurismoPalette();
  const hasSteps = route.steps.length > 0;
  return (
    <View style={styles.stepsSection}>
      <TourismSectionTitle>Pasos</TourismSectionTitle>
      <View style={styles.stepsList}>
        <RouteStepRow
          icon="locate"
          showConnector={hasSteps}
          title="Tu ubicación"
          tone="origin"
        />
        {hasSteps ? (
          route.steps.map((step, index) => (
            <RouteStepRow
              icon={getRouteStepIcon(step)}
              key={`${step.instruction}-${index}`}
              showConnector={index < route.steps.length - 1}
              subtitle={formatDistance(step.distanceMeters)}
              title={step.instruction}
              tone="maneuver"
            />
          ))
        ) : (
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            No hay indicaciones detalladas para este trayecto.
          </Text>
        )}
      </View>
    </View>
  );
}

function RouteStepRow({
  icon,
  showConnector,
  subtitle,
  title,
  tone,
}: Readonly<{
  icon: TurismoIconName;
  showConnector: boolean;
  subtitle?: string;
  title: string;
  tone: "origin" | "maneuver";
}>) {
  const colors = useTurismoPalette();
  const iconColors =
    tone === "origin"
      ? { background: colors.map.locationSoft, foreground: colors.map.location }
      : { background: colors.primarySoft, foreground: colors.primaryStrong };
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIcon, { backgroundColor: iconColors.background }]}>
        <TurismoIcon
          color={iconColors.foreground}
          name={icon}
          size={turismoIconSizes.sm}
        />
      </View>
      <View style={styles.stepCopy}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.caption, { color: colors.textFaint }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showConnector ? (
        <View
          style={[styles.stepConnector, { backgroundColor: colors.border }]}
        />
      ) : null}
    </View>
  );
}

/**
 * Main action of the preview: calculate (or retry) the route until there is
 * one, then start navigation.
 */
export function RoutePrimaryAction({
  hasRoute,
  locationRequesting,
  onCalculateRoute,
  onStartNavigation,
  routeError,
  startingNavigation,
  style,
}: Readonly<{
  hasRoute: boolean;
  locationRequesting: boolean;
  onCalculateRoute: () => void;
  onStartNavigation: () => void;
  routeError: string | null;
  startingNavigation: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  if (hasRoute) {
    return (
      <TourismActionButton
        disabled={startingNavigation}
        icon="navigation"
        label="Iniciar navegación"
        loading={startingNavigation}
        onPress={onStartNavigation}
        style={style}
      />
    );
  }
  return (
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
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  overview: { gap: turismoSpacing.xxs, paddingVertical: turismoSpacing.xs },
  metric: { ...turismoMetricTypography.md },
  overviewMeta: { ...turismoTypography.body },
  compactSummary: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  caption: { ...turismoTypography.caption, flexShrink: 1, minWidth: 0 },
  noticeCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  noticeText: { ...turismoTypography.caption, flex: 1 },
  stepsSection: { gap: turismoSpacing.sm },
  stepsList: { gap: turismoSpacing.xxs },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: stepRowMinHeight,
    minWidth: 0,
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
  stepTitle: { ...turismoTypography.body, flexShrink: 1, minWidth: 0 },
  stepConnector: {
    bottom: -turismoSpacing.xxs,
    left: (turismoMetrics.controlSm - turismoMetrics.borderWidthStrong) / 2,
    position: "absolute",
    top: turismoMetrics.controlSm,
    width: turismoMetrics.borderWidthStrong,
  },
});
