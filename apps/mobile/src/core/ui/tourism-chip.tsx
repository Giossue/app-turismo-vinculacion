import { StyleSheet, View } from "react-native";
import { Chip as PaperChip } from "react-native-paper";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoTypography,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
  useTourismGlassBorderColor,
} from "./tourism-glass";

export function TourismChoiceChip({
  disabled = false,
  glass = false,
  icon,
  label,
  onPress,
  selected,
}: Readonly<{
  disabled?: boolean;
  /** Fondo de vidrio cuando no está seleccionado (chips sobre el mapa). */
  glass?: boolean;
  /** Ícono monocromo antes del texto, del mismo color que la etiqueta. */
  icon?: TurismoIconName;
  label: string;
  onPress: () => void;
  selected: boolean;
}>) {
  const colors = useTurismoPalette();
  const glassBorderColor = useTourismGlassBorderColor(colors.border);
  const frosted = glass && !selected;
  const contentColor = selected ? colors.onPrimary : colors.textMuted;
  const chip = (
    <PaperChip
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      compact
      disabled={disabled}
      hitSlop={turismoMetrics.chipHitSlop}
      icon={
        icon
          ? () => (
              <TurismoIcon
                color={contentColor}
                name={icon}
                size={turismoIconSizes.sm}
              />
            )
          : undefined
      }
      mode={selected ? "flat" : "outlined"}
      onPress={onPress}
      selected={selected}
      showSelectedCheck={false}
      showSelectedOverlay={false}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? colors.primary
            : frosted
              ? "transparent"
              : colors.surface,
          borderColor: selected
            ? colors.primary
            : frosted
              ? glassBorderColor
              : colors.border,
        },
        glass && styles.glassBorder,
      ]}
      textStyle={[styles.chipText, { color: contentColor }]}
    >
      {label}
    </PaperChip>
  );
  if (!frosted) return chip;
  return (
    <View style={styles.chipGlass}>
      <TourismGlassFill />
      {chip}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    justifyContent: "center",
    minHeight: turismoMetrics.chipHeight,
  },
  chipText: { ...turismoTypography.label },
  chipGlass: { borderRadius: turismoRadii.pill, overflow: "hidden" },
  glassBorder: { borderWidth: turismoGlassBorderWidth },
});
