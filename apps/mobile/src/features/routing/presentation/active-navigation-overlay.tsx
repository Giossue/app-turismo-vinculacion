import type { Href } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistance } from "@/core/format/distance";
import { formatClockTime, formatDurationSeconds } from "@/core/format/duration";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
} from "@/core/ui/tourism-glass";
import {
  TourismActionButton,
  TourismIconAction,
} from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetricTypography,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import {
  arrivalAutoCloseSeconds,
  useArrivalAutoClose,
} from "../application/use-arrival-auto-close";
import type { NavigationGuidance } from "../domain/navigation-guidance";
import type { CalculatedRoute } from "../domain/routing";
import type { NearbyCenter } from "@/features/nearby/presentation/nearby-href";
import { ArrivalPlaceActions } from "./arrival-place-actions";
import type { RoutePlace } from "./route-href";
import { getRouteStepIcon } from "./route-step-icon";
import { useMessages } from "@/core/i18n/use-language";
import { messages } from "@/core/i18n/language";
import { getStepInstruction } from "../domain/route-instruction-text";

/** The arrival time only needs minute precision. */
const clockRefreshMs = 30_000;
/** Keeps the guidance card steady while short instructions come and go. */
const guidanceCardMinHeight = turismoMetrics.controlMd + turismoSpacing.xxl;

type ActiveNavigationOverlayProps = Readonly<{
  /** Arrival starts a countdown that closes navigation through `onStop`. */
  arrived: boolean;
  /** Punto de llegada, para ver lugares cercanos al terminar. */
  arrivalPoint: NearbyCenter;
  guidance: NavigationGuidance | null;
  isFollowing: boolean;
  isRecalculating: boolean;
  message: string | null;
  notice: string | null;
  /** Height of the bottom bar, to keep map controls above it. */
  onBottomInsetChange?: (height: number) => void;
  /** Abre otra pantalla desde las acciones de llegada. */
  onOpenPlace: (href: Href) => void;
  onRecenter: () => void;
  onStop: () => void;
  onRetryRoute?: () => void;
  /** Lugar del catálogo; sin él solo se ofrece ver lugares cercanos. */
  place: RoutePlace | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  route: CalculatedRoute;
}>;

/**
 * Active navigation mode: next maneuver (and the following one) on top, and
 * a bottom bar with close, remaining time/distance/ETA and recenter.
 */
export function ActiveNavigationOverlay({
  arrivalPoint,
  arrived,
  guidance,
  isFollowing,
  isRecalculating,
  message,
  notice,
  onBottomInsetChange,
  onOpenPlace,
  onRecenter,
  onStop,
  onRetryRoute,
  place,
  remainingDistanceMeters,
  remainingDurationSeconds,
  route,
}: ActiveNavigationOverlayProps) {
  const colors = useTurismoPalette();
  const text = useMessages().routing.overlay;
  const insets = useSafeAreaInsets();
  const now = useNow(clockRefreshMs);
  const arrivalSecondsLeft = useArrivalAutoClose(arrived, onStop);
  // El contador cambia cada segundo; el lector lo anuncia una sola vez.
  useEffect(() => {
    if (!arrived) return;
    AccessibilityInfo.announceForAccessibility(
      messages().routing.overlay.closesInLabel(arrivalAutoCloseSeconds),
    );
  }, [arrived]);
  const firstStep = route.steps[0];
  const activeGuidance: NavigationGuidance | null =
    guidance ??
    (firstStep
      ? {
          distanceMeters: firstStep.distanceMeters,
          instruction: getStepInstruction(route, 0),
          stepIndex: 0,
        }
      : null);
  const activeStep = activeGuidance
    ? (route.steps[activeGuidance.stepIndex] ?? firstStep)
    : firstStep;
  const nextStep = activeGuidance
    ? route.steps[activeGuidance.stepIndex + 1]
    : undefined;
  const nextStepInstruction = activeGuidance
    ? getStepInstruction(route, activeGuidance.stepIndex + 1)
    : "";
  const remainingDistance =
    remainingDistanceMeters ?? Math.max(0, route.distanceMeters);
  const remainingDuration =
    remainingDurationSeconds ?? Math.max(0, route.durationSeconds);
  // A status message or a recalculation replaces the maneuver details.
  const showManeuverDetails = !isRecalculating && !message;
  const instruction = isRecalculating
    ? text.recalculating
    : (message ?? activeGuidance?.instruction ?? text.following);
  const arrivalClock = formatClockTime(
    now + Math.max(0, remainingDuration) * 1000,
  );
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
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
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
                {text.inDistance(formatDistance(activeGuidance.distanceMeters))}
              </Text>
            ) : null}
            {arrivalSecondsLeft !== null ? (
              <Text
                accessibilityLabel={text.closesInLabel(arrivalSecondsLeft)}
                style={[styles.countdown, { color: colors.primaryStrong }]}
              >
                {text.closesIn(arrivalSecondsLeft)}
              </Text>
            ) : null}
            {arrivalSecondsLeft !== null ? (
              <ArrivalPlaceActions
                destination={arrivalPoint}
                onOpen={onOpenPlace}
                place={place}
              />
            ) : null}
            {notice ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.caption, { color: colors.textMuted }]}
              >
                {notice}
              </Text>
            ) : null}
            {onRetryRoute ? (
              <TourismActionButton
                disabled={isRecalculating}
                icon="refresh"
                label={text.updateRoute}
                mode="outlined"
                onPress={onRetryRoute}
              />
            ) : null}
          </View>
        </View>

        {nextStep && showManeuverDetails ? (
          <View
            accessible
            accessibilityLabel={text.thenLabel(nextStepInstruction)}
            style={[styles.nextStep, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.nextLabel, { color: colors.onPrimary }]}>
              {text.then}
            </Text>
            <Text style={[styles.nextText, { color: colors.onPrimary }]}>
              {nextStepInstruction}
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
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, turismoSpacing.sm),
          },
        ]}
      >
        <TourismGlassFill material="regular" />
        <TourismIconAction
          accessibilityLabel={text.close}
          icon="close"
          onPress={onStop}
          style={idleControlStyle}
        />
        <View
          accessible
          accessibilityLabel={text.summaryLabel(
            formatDurationSeconds(remainingDuration),
            formatDistance(remainingDistance),
            arrivalClock,
          )}
          style={styles.summary}
        >
          <Text style={[styles.summaryValue, { color: colors.primaryStrong }]}>
            {formatDurationSeconds(remainingDuration)}
          </Text>
          <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
            {formatDistance(remainingDistance)} · {arrivalClock}
          </Text>
        </View>
        <TourismIconAction
          accessibilityLabel={
            isFollowing ? text.followingLocation : text.recenter
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
  countdown: { ...turismoTypography.label },
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
    borderTopWidth: turismoGlassBorderWidth,
    bottom: 0,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    left: 0,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
    position: "absolute",
    right: 0,
  },
  summary: { alignItems: "center", flex: 1, gap: turismoSpacing.xxs },
  summaryValue: { ...turismoMetricTypography.lg },
  summaryMeta: { ...turismoTypography.body },
});
