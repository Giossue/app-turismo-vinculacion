import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  getTurismoColors,
  turismoColors,
  turismoIconSizes,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

export function useTurismoPalette() {
  return getTurismoColors(useColorScheme() === "dark" ? "dark" : "light");
}

export function TourismSearchField({
  accessibilityLabel,
  onChangeText,
  onClear,
  placeholder,
  value,
}: Readonly<{
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  value: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.searchbar,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TurismoIcon
        color={colors.primary}
        name="search"
        size={turismoIconSizes.md}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[styles.searchInput, { color: colors.text }]}
        value={value}
      />
      {value && onClear ? (
        <Pressable
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={styles.searchClear}
        >
          <TurismoIcon color={colors.textMuted} name="close" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function TourismIconAction({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  selected = false,
  style,
}: Readonly<{
  accessibilityLabel: string;
  disabled?: boolean;
  icon: TurismoIconName;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <TurismoIcon
        color={selected ? colors.onPrimary : colors.text}
        name={icon}
        size={turismoIconSizes.md}
      />
    </Pressable>
  );
}

export function TourismChoiceChip({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; onPress: () => void; selected: boolean }>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.onPrimary : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TourismActionButton({
  disabled = false,
  icon,
  label,
  mode = "contained",
  onPress,
  style,
}: Readonly<{
  disabled?: boolean;
  icon?: TurismoIconName;
  label: string;
  mode?: "contained" | "outlined" | "ghost";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>) {
  const colors = useTurismoPalette();
  const backgroundColor =
    mode === "contained"
      ? colors.accent
      : mode === "outlined"
        ? colors.surface
        : "transparent";
  const foregroundColor =
    mode === "contained" ? colors.onPrimary : colors.primaryStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor: mode === "outlined" ? colors.border : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      {icon ? <TurismoIcon color={foregroundColor} name={icon} size={18} /> : null}
      <Text style={[styles.actionButtonText, { color: foregroundColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TourismSurface({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function TourismBadge({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.primarySoft },
        style,
      ]}
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
    <Text style={[styles.sectionTitle, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  searchbar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 54,
    paddingHorizontal: turismoSpacing.md,
  },
  searchInput: {
    ...turismoTypography.body,
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
  },
  searchClear: { padding: turismoSpacing.xxs },
  iconAction: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    minWidth: 48,
    padding: turismoSpacing.xs,
  },
  chip: {
    borderRadius: turismoRadii.pill,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  chipText: { ...turismoTypography.label },
  actionButton: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: turismoSpacing.lg,
  },
  actionButtonText: { ...turismoTypography.label },
  surface: {
    borderRadius: turismoRadii.lg,
    borderWidth: 1,
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

export const turismoThemeColors = turismoColors;
