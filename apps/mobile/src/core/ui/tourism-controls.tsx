import { useEffect, useRef, type ReactNode } from "react";
import {
  Keyboard,
  Pressable,
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
  IconButton as PaperIconButton,
  Surface as PaperSurface,
} from "react-native-paper";

import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  getTurismoColors,
  turismoColors,
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { useTurismoTheme } from "./theme-context";

export function useTurismoPalette() {
  return getTurismoColors(useTurismoTheme().scheme);
}

export function TourismSearchField({
  accessibilityLabel,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  onSubmitEditing,
  placeholder,
  trailing,
  value,
}: Readonly<{
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  trailing?: ReactNode;
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
        blurOnSubmit
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        ref={inputRef}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
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
      {trailing}
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
    <PaperIconButton
      accessibilityLabel={accessibilityLabel}
      containerColor={selected ? colors.primary : colors.surface}
      disabled={disabled}
      icon={({ color, size }) => (
        <TurismoIcon color={color} name={icon} size={size} />
      )}
      iconColor={selected ? colors.onPrimary : colors.text}
      mode={selected ? "contained" : "outlined"}
      onPress={onPress}
      selected={selected}
      size={turismoIconSizes.md}
      style={[
        styles.iconAction,
        { borderColor: selected ? colors.primary : colors.border },
        style,
      ]}
    />
  );
}

export function TourismChoiceChip({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; onPress: () => void; selected: boolean }>) {
  const colors = useTurismoPalette();
  return (
    <PaperChip
      accessibilityRole="button"
      accessibilityState={{ selected }}
      compact
      hitSlop={turismoMetrics.chipHitSlop}
      mode={selected ? "flat" : "outlined"}
      onPress={onPress}
      selected={selected}
      showSelectedCheck={false}
      showSelectedOverlay={false}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      textStyle={[
        styles.chipText,
        { color: selected ? colors.onPrimary : colors.textMuted },
      ]}
    >
      {label}
    </PaperChip>
  );
}

export function TourismActionButton({
  compact = false,
  disabled = false,
  icon,
  label,
  mode = "contained",
  onPress,
  style,
}: Readonly<{
  compact?: boolean;
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
      ? colors.primary
      : mode === "outlined"
        ? colors.surface
        : "transparent";
  const foregroundColor =
    mode === "contained" ? colors.onPrimary : colors.primaryStrong;
  return (
    <PaperButton
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      compact={compact}
      buttonColor={backgroundColor}
      contentStyle={[
        styles.actionButtonContent,
        compact && styles.actionButtonContentCompact,
      ]}
      disabled={disabled}
      hitSlop={compact ? turismoMetrics.chipHitSlop : undefined}
      icon={
        icon
          ? ({ color, size }) => (
              <TurismoIcon color={color} name={icon} size={size} />
            )
          : undefined
      }
      labelStyle={[
        styles.actionButtonText,
        compact && styles.actionButtonTextCompact,
        { color: foregroundColor },
      ]}
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
    <Text style={[styles.sectionTitle, { color: colors.text }, style]}>
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
    width: turismoMetrics.controlMd,
  },
  chip: {
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    justifyContent: "center",
    minHeight: turismoMetrics.chipHeight,
  },
  chipText: { ...turismoTypography.label },
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
  actionButtonText: { ...turismoTypography.label },
  actionButtonTextCompact: {
    ...turismoTypography.label,
    marginVertical: turismoSpacing.xs - turismoSpacing.xxs,
  },
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

export const turismoThemeColors = turismoColors;
