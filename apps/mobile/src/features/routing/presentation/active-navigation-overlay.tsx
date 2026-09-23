import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistance } from "@/core/format/distance";
import { formatClockTime, formatDurationSeconds } from "@/core/format/duration";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetricTypography,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { NavigationGuidance } from "../domain/navigation-guidance";
import type { CalculatedRoute } from "../domain/routing";
import { getRouteStepIcon } from "./route-step-icon";

/** The arrival time only needs minute precision. */
const clockRefreshMs = 30_000;
/** Keeps the guidance card steady while short instructions come and go. */
const guidanceCardMinHeight = turismoMetrics.controlMd + turismoSpacing.xxl;

type ActiveNavigationOverlayProps = Readonly<{
  guidance: NavigationGuidance | null;
  isFollowing: boolean;
  isRecalculating: boolean;
  message: string | null;
  notice: string | null;
  /** Height of the bottom bar, to keep map controls above it. */
  onBottomInsetChange?: (height: number) => void;
  onRecenter: () => void;
  onStop: () => void;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  route: CalculatedRoute;
}>;

/**
 * Active navigation mode: next maneuver (and the following one) on top, and
 * a bottom bar with close, remaining time/distance/ETA and recenter.
 */
export function ActiveNavigationOverlay({
  guidance,
  isFollowing,
  isRecalculating,
  message,
  notice,
  onBottomInsetChange,
  onRecenter,
  onStop,
  remainingDistanceMeters,
  remainingDurationSeconds,
  route,
}: ActiveNavigationOverlayProps) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const now = useNow(clockRefreshMs);
  const firstStep = route.steps[0];
  const activeGuidance: NavigationGuidance | null =
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
  // A status message or a recalculation replaces the maneuver details.
  const showManeuverDetails = !isRecalculating && !message;
  const instruction = isRecalculating
    ? "Recalculando ruta…"
    : (message ?? activeGuidance?.instruction ?? "Siguiendo tu ubicación…");
  const idleControlStyle = {
    backgroundColor: colors.background,
    borderColor: colors.textFaint,
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[styles.topStack, { top: insets.top + turismoSpacing.sm }]}
      >
        <View
          style={[styles.guidanceCard, { backgroundColor: colors.primarySoft }]}
        >
          <View
            style={[styles.guidanceIcon, { backgroundColor: colors.primary }]}
          >
            <TurismoIcon
              color={colors.onPrimary}
              name={activeStep ? getRouteStepIcon(activeStep) : "navigation"}
              size={turismoIconSizes.lg}
            />
          </View>
          <View style={styles.guidanceCopy}>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.guidanceText, { color: colors.text }]}
            >
              {instruction}
            </Text>
            {activeGuidance && showManeuverDetails ? (
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                En {formatDistance(activeGuidance.distanceMeters)}
              </Text>
            ) : null}
            {notice ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.caption, { color: colors.textMuted }]}
              >
                {notice}
              </Text>
            ) : null}
          </View>
        </View>

        {nextStep && showManeuverDetails ? (
          <View style={[styles.nextStep, { backgroundColor: colors.primary }]}>
            <Text style={[styles.nextLabel, { color: colors.onPrimary }]}>
              Luego
            </Text>
            <Text style={[styles.nextText, { color: colors.onPrimary }]}>
              {nextStep.instruction}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        onLayout={(event) =>
          onBottomInsetChange?.(event.nativeEvent.layout.height)
        }
        style={[
          styles.bottomBar,
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
          style={idleControlStyle}
        />
        <View style={styles.summary}>
          <Text style={[styles.summaryValue, { color: colors.primaryStrong }]}>
            {formatDurationSeconds(remainingDuration)}
          </Text>
          <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
            {formatDistance(remainingDistance)} ·{" "}
            {formatClockTime(now + Math.max(0, remainingDuration) * 1000)}
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
          style={isFollowing ? undefined : idleControlStyle}
        />
      </View>
    </View>
  );
}

/** Current time, refreshed every `intervalMs`. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return now;
}

const styles = StyleSheet.create({
  // Guidance and the next step stack in one column, so longer or enlarged
  // text pushes the next step down instead of overlapping it.
  topStack: {
    gap: turismoSpacing.xs,
    left: turismoSpacing.sm,
    position: "absolute",
    right: turismoSpacing.sm,
  },
  guidanceCard: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: guidanceCardMinHeight,
    padding: turismoSpacing.sm,
  },
  guidanceIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  guidanceCopy: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  guidanceText: { ...turismoTypography.heading, flexShrink: 1, minWidth: 0 },
  caption: { ...turismoTypography.caption },
  nextStep: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: turismoRadii.md,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  nextLabel: { ...turismoTypography.label },
  nextText: { ...turismoTypography.label, flexShrink: 1, minWidth: 0 },
  bottomBar: {
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
  summary: { alignItems: "center", flex: 1, gap: turismoSpacing.xxs },
  summaryValue: { ...turismoMetricTypography.lg },
  summaryMeta: { ...turismoTypography.body },
});
