import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/**
 * Tarjeta seleccionable de una lista dentro de una sheet: ícono, título,
 * subtítulo opcional y un chevron (o un check si está seleccionada).
 */
export function TourismOptionRow({
  accessibilityHint,
  compact = false,
  icon,
  onPress,
  selected = false,
  subtitle,
  title,
}: Readonly<{
  accessibilityHint?: string;
  compact?: boolean;
  icon: TurismoIconName;
  onPress: () => void;
  selected?: boolean;
  subtitle?: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.icon,
          compact && styles.iconCompact,
          { backgroundColor: colors.primarySoft },
        ]}
      >
        <TurismoIcon
          color={colors.primaryStrong}
          name={icon}
          size={compact ? turismoIconSizes.sm : turismoIconSizes.md}
        />
      </View>
      <View style={styles.copy}>
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            compact && styles.titleCompact,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <TurismoIcon
        color={selected ? colors.primaryStrong : colors.textMuted}
        name={selected ? "check" : "chevronRight"}
        size={compact ? turismoIconSizes.sm : turismoIconSizes.md}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  pressed: { opacity: turismoOpacity.pressed },
  rowCompact: {
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.xs,
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xs,
  },
  icon: {
    alignItems: "center",
    borderRadius: turismoRadii.lg,
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  copy: { flex: 1, gap: turismoSpacing.xxs },
  iconCompact: {
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.optionIconSm,
    width: turismoMetrics.optionIconSm,
  },
  title: { ...turismoTypography.body, fontWeight: "700" },
  titleCompact: { ...turismoTypography.label },
  subtitle: { ...turismoTypography.caption },
});
