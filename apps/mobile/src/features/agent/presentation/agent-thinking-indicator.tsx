import { StyleSheet, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
} from "@/core/ui/tokens";

const dotDurationMs = 420;
const dotDelaysMs = [0, 160, 320] as const;

/** Shown until the first words of an answer arrive. */
export function AgentThinkingIndicator() {
  const colors = useTurismoPalette();

  return (
    <View
      accessible
      accessibilityLabel="El agente está preparando una respuesta"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.row}
    >
      <View style={styles.icon}>
        <TurismoIcon
          color={colors.primaryStrong}
          name="bot"
          size={turismoIconSizes.md}
        />
      </View>
      <View style={styles.dots}>
        {dotDelaysMs.map((delayMs) => (
          <ThinkingDot
            color={colors.primaryStrong}
            delayMs={delayMs}
            key={delayMs}
          />
        ))}
      </View>
    </View>
  );
}

function ThinkingDot({
  color,
  delayMs,
}: Readonly<{ color: string; delayMs: number }>) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: dotDurationMs,
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0.35, {
            duration: dotDurationMs,
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    ),
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  icon: { paddingTop: turismoSpacing.xs },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    height: turismoIconSizes.md,
    justifyContent: "center",
    marginTop: turismoSpacing.xs,
    minWidth: turismoIconSizes.md * 1.2,
  },
  dot: {
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.indicatorDot,
    width: turismoMetrics.indicatorDot,
  },
});
