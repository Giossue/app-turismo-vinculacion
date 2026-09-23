import {
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTurismoPalette } from "./theme-context";
import { turismoOpacity } from "./tokens";

export type TourismPressableProps = Omit<PressableProps, "style"> &
  Readonly<{
    /** Lets an icon-only control ripple outside its bounds (Android). */
    borderlessRipple?: boolean;
    rippleColor?: string;
    style?:
      | StyleProp<ViewStyle>
      | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  }>;

/**
 * `Pressable` with the platform feedback used across the app: a themed
 * ripple on Android and the shared pressed opacity elsewhere. Disabled
 * controls are dimmed with `turismoOpacity.disabled`. Callers still set the
 * accessibility role, label and state.
 */
export function TourismPressable({
  borderlessRipple = false,
  disabled,
  rippleColor,
  style,
  ...props
}: Readonly<TourismPressableProps>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      android_ripple={{
        borderless: borderlessRipple,
        color: rippleColor ?? colors.ripple,
        foreground: !borderlessRipple,
      }}
      disabled={disabled}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        Platform.OS !== "android" && state.pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: turismoOpacity.pressed },
  disabled: { opacity: turismoOpacity.disabled },
});
