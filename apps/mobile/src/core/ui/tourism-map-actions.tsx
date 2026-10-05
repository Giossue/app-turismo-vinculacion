import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { G, Polygon, Svg } from "react-native-svg";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoFixedColors,
  turismoIconSizes,
  turismoMetrics,
  turismoPaperReset,
  turismoRadii,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
  useTourismGlassBorderColor,
} from "./tourism-glass";
import { TourismPressable } from "./tourism-pressable";

/**
 * Round icon button. `surface` draws the bordered map-control chip; `glass`
 * uses a translucent theme fill, for controls floating over the map;
 * `ghost` keeps only the icon, for headers and toolbars that already have a
 * surface.
 */
export function TourismIconAction({
  accessibilityLabel,
  disabled = false,
  filled = false,
  icon,
  onPress,
  selected = false,
  slashed = false,
  style,
  variant = "surface",
}: Readonly<{
  accessibilityLabel: string;
  disabled?: boolean;
  filled?: boolean;
  icon: TurismoIconName;
  onPress: () => void;
  selected?: boolean;
  slashed?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "surface" | "glass" | "ghost";
}>) {
  const colors = useTurismoPalette();
  const glassBorderColor = useTourismGlassBorderColor(colors.border);
  const idleBackground = variant === "surface" ? colors.surface : "transparent";
  const idleBorder =
    variant === "ghost"
      ? "transparent"
      : variant === "glass"
        ? glassBorderColor
        : colors.border;
  return (
    <TourismPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={[
        styles.iconAction,
        variant === "ghost" && styles.iconActionGhost,
        {
          backgroundColor: selected ? colors.primary : idleBackground,
          borderColor: selected ? colors.primary : idleBorder,
        },
        variant === "glass" && styles.glassBorder,
        style,
      ]}
    >
      {variant === "glass" && !selected ? <TourismGlassFill /> : null}
      <View
        pointerEvents="none"
        style={[
          styles.iconGraphic,
          { height: turismoIconSizes.md, width: turismoIconSizes.md },
        ]}
      >
        <TurismoIcon
          color={selected ? colors.onPrimary : colors.text}
          fill={filled && selected ? colors.onPrimary : "none"}
          fillOpacity={filled && selected ? 1 : undefined}
          name={icon}
          size={turismoIconSizes.md}
        />
        {slashed ? (
          <View
            style={[
              styles.iconSlash,
              {
                backgroundColor: colors.textMuted,
                width: turismoIconSizes.md * 1.4,
              },
            ]}
          />
        ) : null}
      </View>
    </TourismPressable>
  );
}

export function TourismCompassAction({
  accessibilityLabel,
  bearing,
  glass = false,
  onPress,
  style,
}: Readonly<{
  accessibilityLabel: string;
  bearing: number;
  glass?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>) {
  const colors = useTurismoPalette();
  const glassBorderColor = useTourismGlassBorderColor(colors.border);

  return (
    <TourismPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.compassAction,
        {
          backgroundColor: glass ? "transparent" : colors.surface,
          borderColor: glass ? glassBorderColor : colors.border,
        },
        glass && styles.glassBorder,
        style,
      ]}
    >
      {glass ? <TourismGlassFill /> : null}
      <Svg
        height={turismoMetrics.compassGraphic}
        pointerEvents="none"
        style={styles.compassGraphic}
        viewBox="0 0 24 24"
        width={turismoMetrics.compassGraphic}
      >
        <G rotation={-bearing} origin="12, 12">
          <Polygon
            fill={turismoFixedColors.compassNorth}
            points="12,4 15,12 12,10"
          />
          <Polygon
            fill={turismoFixedColors.compassNorthShade}
            opacity={0.9}
            points="12,4 9,12 12,10"
          />
          <Polygon fill={colors.text} points="12,20 15,12 12,10" />
          <Polygon fill={colors.text} opacity={0.7} points="12,20 9,12 12,10" />
        </G>
      </Svg>
    </TourismPressable>
  );
}

const styles = StyleSheet.create({
  iconAction: {
    ...turismoPaperReset,
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    overflow: "hidden",
    width: turismoMetrics.controlMd,
  },
  iconActionGhost: { borderWidth: 0 },
  iconGraphic: { alignItems: "center", justifyContent: "center" },
  iconSlash: {
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.borderWidthStrong,
    position: "absolute",
    transform: [{ rotate: "-45deg" }],
  },
  compassAction: {
    ...turismoPaperReset,
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlLg,
    justifyContent: "center",
    overflow: "hidden",
    width: turismoMetrics.controlLg,
  },
  compassGraphic: {
    height: turismoMetrics.compassGraphic,
    width: turismoMetrics.compassGraphic,
  },
  glassBorder: { borderWidth: turismoGlassBorderWidth },
});
