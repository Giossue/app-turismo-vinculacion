import { ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useTurismoMapPalette } from "@/core/ui/theme-context";
import { turismoOpacity } from "@/core/ui/tokens";

const fadeDurationMs = 250;

/**
 * Translucent cover shown while MapLibre loads its style. It fades in and out
 * so the map does not pop in over it.
 */
export function MapLoadingOverlay({ visible }: Readonly<{ visible: boolean }>) {
  const colors = useTurismoMapPalette();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? turismoOpacity.loadingOverlay : 0, {
      duration: fadeDurationMs,
    }),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        { backgroundColor: colors.background },
        animatedStyle,
      ]}
    >
      <ActivityIndicator color={colors.primary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
