import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

/** Relative bar heights; the microphone level scales them all. */
const barShape = [0.45, 0.8, 1, 0.7, 0.5] as const;
const barMaxHeight = 22;
const barMinHeight = 4;

/** Composer content while the agent listens: level bars and elapsed time. */
export function AgentVoiceListening({
  elapsedMs,
  level,
}: Readonly<{ elapsedMs: number; level: number }>) {
  const colors = useTurismoPalette();
  const seconds = Math.floor(elapsedMs / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <View
      accessibilityLabel="Escuchando. Habla y haz una pausa para enviar."
      accessibilityLiveRegion="polite"
      style={styles.row}
    >
      <View style={[styles.dot, { backgroundColor: colors.danger }]} />
      <View style={styles.bars}>
        {barShape.map((shape, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: colors.primary,
                height: Math.max(barMinHeight, barMaxHeight * shape * level),
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={[styles.label, { color: colors.textMuted }]}
        numberOfLines={1}
      >
        Escuchando… {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
    paddingHorizontal: turismoSpacing.xs,
  },
  dot: { borderRadius: turismoRadii.pill, height: 8, width: 8 },
  bars: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    height: barMaxHeight,
  },
  bar: { borderRadius: turismoRadii.pill, width: 3 },
  label: { ...turismoTypography.bodySmall, flexShrink: 1 },
});
