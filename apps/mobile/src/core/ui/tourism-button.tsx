import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Button as PaperButton } from "react-native-paper";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoMetrics,
  turismoPaperReset,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";

/**
 * Pill button. `loading` shows Paper's spinner in place of the icon.
 * `size="lg"` is the prominent call to action of a hero screen;
 * `trailingIcon` draws the icon after the label (e.g. a chevron).
 */
export function TourismActionButton({
  accessibilityLabel,
  compact = false,
  disabled = false,
  icon,
  label,
  loading = false,
  mode = "contained",
  onPress,
  size = "md",
  style,
  trailingIcon,
}: Readonly<{
  /** Spoken name when the visible label needs context. */
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  icon?: TurismoIconName;
  label: string;
  loading?: boolean;
  mode?: "contained" | "outlined" | "ghost";
  onPress?: () => void;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
  trailingIcon?: TurismoIconName;
}>) {
  const colors = useTurismoPalette();
  const backgroundColor =
    mode === "contained"
      ? colors.primary
      : mode === "outlined"
        ? colors.surface
        : "transparent";
  const foregroundColor =
    mode === "contained" ? colors.onPrimary : colors.primaryStrong;
  const iconName = trailingIcon ?? icon;
  return (
    <PaperButton
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      compact={compact}
      buttonColor={backgroundColor}
      contentStyle={[
        styles.actionButtonContent,
        compact && styles.actionButtonContentCompact,
        size === "lg" && styles.actionButtonContentLarge,
        trailingIcon && styles.actionButtonContentTrailing,
      ]}
      disabled={disabled}
      hitSlop={compact ? turismoMetrics.chipHitSlop : undefined}
      icon={
        iconName
          ? ({ color, size: iconSize }) => (
              <TurismoIcon color={color} name={iconName} size={iconSize} />
            )
          : undefined
      }
      labelStyle={[
        styles.actionButtonText,
        compact && styles.actionButtonTextCompact,
        size === "lg" && styles.actionButtonTextLarge,
        { color: foregroundColor },
      ]}
      loading={loading}
      mode={mode === "ghost" ? "text" : mode}
      onPress={onPress}
      textColor={foregroundColor}
      uppercase={false}
      style={[
        styles.actionButton,
        {
          borderColor: mode === "outlined" ? colors.border : "transparent",
        },
        style,
      ]}
    >
      {label}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    ...turismoPaperReset,
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
  },
  actionButtonContent: {
    minHeight: turismoMetrics.controlMd,
    paddingHorizontal: turismoSpacing.lg,
  },
  actionButtonContentCompact: {
    minHeight: turismoMetrics.chipHeight,
    paddingHorizontal: turismoSpacing.sm,
  },
  actionButtonContentLarge: { minHeight: turismoMetrics.controlLg },
  actionButtonContentTrailing: { flexDirection: "row-reverse" },
  actionButtonText: { ...turismoTypography.label },
  actionButtonTextCompact: {
    ...turismoTypography.label,
    marginVertical: turismoSpacing.xs - turismoSpacing.xxs,
  },
  actionButtonTextLarge: { ...turismoTypography.labelLarge },
});
