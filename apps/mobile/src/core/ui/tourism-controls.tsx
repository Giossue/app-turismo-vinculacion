import { useEffect, useRef, type ReactNode } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  Button as PaperButton,
  Chip as PaperChip,
  Surface as PaperSurface,
} from "react-native-paper";
import { G, Polygon, Svg } from "react-native-svg";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoFixedColors,
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";
import { TourismGlassFill, turismoGlassBorderWidth } from "./tourism-glass";
import { TourismPressable } from "./tourism-pressable";

// The clear icon keeps its compact look; hitSlop extends it to a 44dp target.
const searchClearHitSlop =
  (turismoMetrics.touchTarget - turismoIconSizes.sm) / 2 - turismoSpacing.xxs;

export function TourismSearchField({
  accessibilityLabel,
  autoFocus = false,
  glass = false,
  onChangeText,
  onClear,
  onBlur,
  onFocus,
  onSubmitEditing,
  placeholder,
  value,
}: Readonly<{
  accessibilityLabel: string;
  autoFocus?: boolean;
  /** Fondo de vidrio, para el buscador que flota sobre el mapa. */
  glass?: boolean;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  value: string;
}>) {
  const colors = useTurismoPalette();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const blurInput = () => inputRef.current?.blur();
    const didHideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      blurInput,
    );
    const willHideSubscription = Keyboard.addListener(
      "keyboardWillHide",
      blurInput,
    );

    return () => {
      didHideSubscription.remove();
      willHideSubscription.remove();
    };
  }, []);

  return (
    <View
      style={[
        styles.searchbar,
        {
          backgroundColor: glass ? "transparent" : colors.surface,
          borderColor: colors.border,
        },
        glass && styles.glassBorder,
      ]}
    >
      {glass ? <TourismGlassFill /> : null}
      <TurismoIcon
        color={colors.mapSearchIcon}
        name="search"
        size={turismoIconSizes.md}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoFocus={autoFocus}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        ref={inputRef}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        style={[styles.searchInput, { color: colors.text }]}
        submitBehavior="blurAndSubmit"
        value={value}
      />
      {value && onClear ? (
        <TourismPressable
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
          borderlessRipple
          hitSlop={searchClearHitSlop}
          onPress={onClear}
          style={styles.searchClear}
        >
          <TurismoIcon
            color={colors.textMuted}
            name="close"
            size={turismoIconSizes.sm}
          />
        </TourismPressable>
      ) : null}
    </View>
  );
}

/**
 * Round icon button. `surface` draws the bordered map-control chip; `glass`
 * is the same chip in frosted glass, for controls floating over the map;
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
  const idleBackground = variant === "surface" ? colors.surface : "transparent";
  const idleBorder = variant === "ghost" ? "transparent" : colors.border;
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
          borderColor: colors.border,
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

export function TourismChoiceChip({
  disabled = false,
  glass = false,
  label,
  onPress,
  selected,
}: Readonly<{
  disabled?: boolean;
  /** Fondo de vidrio cuando no está seleccionado (chips sobre el mapa). */
  glass?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}>) {
  const colors = useTurismoPalette();
  const frosted = glass && !selected;
  const chip = (
    <PaperChip
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      compact
      disabled={disabled}
      hitSlop={turismoMetrics.chipHitSlop}
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
          borderColor: selected ? colors.primary : colors.border,
        },
        glass && styles.glassBorder,
      ]}
      textStyle={[
        styles.chipText,
        { color: selected ? colors.onPrimary : colors.textMuted },
      ]}
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

export function TourismSurface({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <PaperSurface
      mode="flat"
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </PaperSurface>
  );
}

export function TourismBadge({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.primarySoft }, style]}
    >
      <Text style={[styles.badgeText, { color: colors.primaryStrong }]}>
        {children}
      </Text>
    </View>
  );
}

export function TourismSectionTitle({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<TextStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.sectionTitle, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  searchbar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.controlMd,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
  },
  searchInput: {
    ...turismoTypography.body,
    flex: 1,
    minHeight: turismoMetrics.touchTarget,
    paddingVertical: 0,
  },
  searchClear: { padding: turismoSpacing.xxs },
  iconAction: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    margin: 0,
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
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlLg,
    justifyContent: "center",
    margin: 0,
    overflow: "hidden",
    width: turismoMetrics.controlLg,
  },
  compassGraphic: {
    height: turismoMetrics.compassGraphic,
    width: turismoMetrics.compassGraphic,
  },
  chip: {
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    justifyContent: "center",
    minHeight: turismoMetrics.chipHeight,
  },
  chipText: { ...turismoTypography.label },
  chipGlass: { borderRadius: turismoRadii.pill, overflow: "hidden" },
  glassBorder: { borderWidth: turismoGlassBorderWidth },
  actionButton: {
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    margin: 0,
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
  surface: {
    borderRadius: turismoRadii.lg,
    borderWidth: turismoMetrics.borderWidth,
    padding: turismoSpacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: turismoRadii.pill,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xxs,
  },
  badgeText: { ...turismoTypography.caption },
  sectionTitle: { ...turismoTypography.heading },
});
