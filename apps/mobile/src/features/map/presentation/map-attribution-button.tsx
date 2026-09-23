import { Pressable, StyleSheet, Text } from "react-native";

import { useTurismoMapPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

/** Resting opacity: the "i" stays legible without competing with the map. */
const idleOpacity = 0.9;

/** Small "i" in a map corner that opens the MapLibre attribution dialog. */
export function MapAttributionButton({
  bottom = turismoSpacing.xxs,
  left,
  onPress,
}: Readonly<{
  bottom?: number;
  left?: number;
  onPress: () => void;
}>) {
  const colors = useTurismoMapPalette();

  return (
    <Pressable
      accessibilityLabel="Ver atribución del mapa"
      accessibilityRole="button"
      hitSlop={turismoSpacing.xs}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom, left, opacity: pressed ? turismoOpacity.pressed : idleOpacity },
      ]}
    >
      <Text style={[styles.icon, { color: colors.attribution }]}>i</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "flex-start",
    height: turismoMetrics.touchTarget,
    justifyContent: "flex-end",
    paddingBottom: turismoSpacing.xxs / 2,
    paddingLeft: turismoSpacing.xxs / 2,
    position: "absolute",
    width: turismoMetrics.touchTarget,
  },
  icon: { ...turismoTypography.caption, fontWeight: "700" },
});
