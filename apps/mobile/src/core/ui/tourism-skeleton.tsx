import { useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTurismoPalette } from "./theme-context";
import { turismoRadii } from "./tokens";

const pulseDurationMs = 800;
const pulseMinOpacity = 0.45;

/**
 * Bloque que ocupa el lugar de un texto o una imagen mientras carga. Con
 * «reducir movimiento» activo el pulso se detiene y el bloque queda fijo.
 */
export function TourismSkeleton({
  style,
}: Readonly<{ style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(pulseMinOpacity, {
        duration: pulseDurationMs,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        { backgroundColor: colors.border },
        style,
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: turismoRadii.xs },
});
