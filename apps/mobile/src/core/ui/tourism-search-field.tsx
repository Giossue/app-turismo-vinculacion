import { useEffect, useRef } from "react";
import { Keyboard, StyleSheet, TextInput, View } from "react-native";

import { TurismoIcon } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoPaperReset,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
  useTourismGlassBorderColor,
} from "./tourism-glass";
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
  const glassBorderColor = useTourismGlassBorderColor(colors.border);
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
          borderColor: glass ? glassBorderColor : colors.border,
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
        disableFullscreenUI
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
    ...turismoPaperReset,
    flex: 1,
    minHeight: turismoMetrics.touchTarget,
  },
  searchClear: { padding: turismoSpacing.xxs },
  glassBorder: { borderWidth: turismoGlassBorderWidth },
});
