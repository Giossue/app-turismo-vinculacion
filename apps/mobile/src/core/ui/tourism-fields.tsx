import { useState, type Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/** Visible label of a form control; required fields end with an asterisk. */
export function TourismFieldLabel({
  label,
  required = false,
}: Readonly<{ label: string; required?: boolean }>) {
  const colors = useTurismoPalette();
  return (
    <Text style={[styles.label, { color: colors.text }]}>
      {required ? `${label} *` : label}
    </Text>
  );
}

/** Validation message announced by screen readers as soon as it appears. */
export function TourismFieldError({ message }: Readonly<{ message: string }>) {
  const colors = useTurismoPalette();
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.message, { color: colors.danger }]}
    >
      {message}
    </Text>
  );
}

export type TourismTextFieldProps = Omit<
  TextInputProps,
  "multiline" | "secureTextEntry" | "style"
> &
  Readonly<{
    error?: string | null;
    helper?: string;
    label: string;
    multiline?: boolean;
    ref?: Ref<TextInput>;
    required?: boolean;
    /** Hides the value and adds a show/hide toggle, for passwords. */
    secure?: boolean;
  }>;

/**
 * Labeled text input with the Turismo look. Pass `ref` to chain focus with
 * `returnKeyType="next"`; `error` replaces `helper` and is announced.
 */
export function TourismTextField({
  accessibilityLabel,
  error,
  helper,
  label,
  multiline = false,
  ref,
  required = false,
  secure = false,
  ...inputProps
}: Readonly<TourismTextFieldProps>) {
  const colors = useTurismoPalette();
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <TourismFieldLabel label={label} required={required} />
      <View
        style={[
          styles.frame,
          multiline && styles.frameMultiline,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <TextInput
          accessibilityHint={error ?? helper}
          accessibilityLabel={accessibilityLabel ?? label}
          multiline={multiline}
          placeholderTextColor={colors.textFaint}
          ref={ref}
          secureTextEntry={secure && !revealed}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: colors.text },
          ]}
          textAlignVertical={multiline ? "top" : "center"}
          {...inputProps}
        />
        {secure ? (
          <TourismPressable
            accessibilityLabel={
              revealed ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            accessibilityRole="button"
            borderlessRipple
            onPress={() => setRevealed((current) => !current)}
            style={styles.reveal}
          >
            <TurismoIcon
              color={colors.textMuted}
              name={revealed ? "eyeOff" : "eye"}
              size={turismoIconSizes.md}
            />
          </TourismPressable>
        ) : null}
      </View>
      {error ? (
        <TourismFieldError message={error} />
      ) : helper ? (
        <Text style={[styles.message, { color: colors.textFaint }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export type TourismRadioOption<T extends string> = Readonly<{
  description?: string;
  icon?: TurismoIconName;
  label: string;
  value: T;
}>;

/**
 * Single choice among a few options. `row` lays them out as equal pills
 * (e.g. gender); `column` as full-width rows with a description (e.g.
 * appearance). Each option is a `radio` whose whole surface is the target.
 */
export function TourismRadioGroup<T extends string>({
  accessibilityLabel,
  error,
  label,
  layout = "row",
  onChange,
  options,
  required = false,
  value,
}: Readonly<{
  accessibilityLabel?: string;
  error?: string | null;
  label?: string;
  layout?: "row" | "column";
  onChange: (value: T) => void;
  options: readonly TourismRadioOption<T>[];
  required?: boolean;
  value: T | null;
}>) {
  const colors = useTurismoPalette();
  const column = layout === "column";

  return (
    <View style={styles.field}>
      {label ? <TourismFieldLabel label={label} required={required} /> : null}
      <View
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="radiogroup"
        style={column ? styles.radioColumn : styles.radioRow}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <TourismPressable
              accessibilityLabel={
                option.description
                  ? `${option.label}. ${option.description}`
                  : option.label
              }
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                column ? styles.radioOptionRow : styles.radioOptionPill,
                {
                  backgroundColor: checked ? colors.primarySoft : colors.surface,
                  borderColor: checked ? colors.primary : colors.border,
                },
              ]}
            >
              {option.icon ? (
                <TurismoIcon
                  color={checked ? colors.primaryStrong : colors.textMuted}
                  name={option.icon}
                  size={turismoIconSizes.md}
                />
              ) : null}
              <View style={column && styles.radioCopy}>
                <Text
                  style={[
                    styles.label,
                    { color: checked ? colors.primaryStrong : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                {column && option.description ? (
                  <Text
                    style={[styles.description, { color: colors.textMuted }]}
                  >
                    {option.description}
                  </Text>
                ) : null}
              </View>
              {column && checked ? (
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="check"
                  size={turismoIconSizes.md}
                />
              ) : null}
            </TourismPressable>
          );
        })}
      </View>
      {error ? <TourismFieldError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: turismoSpacing.xs },
  label: { ...turismoTypography.label },
  message: { ...turismoTypography.caption },
  frame: {
    alignItems: "center",
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
  },
  frameMultiline: { alignItems: "stretch" },
  input: {
    ...turismoTypography.body,
    flex: 1,
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  inputMultiline: {
    minHeight: turismoMetrics.multilineInputMinHeight,
    paddingVertical: turismoSpacing.sm,
  },
  reveal: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  radioRow: { flexDirection: "row", gap: turismoSpacing.sm },
  radioColumn: { gap: turismoSpacing.xs },
  radioOptionPill: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "center",
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.sm,
  },
  radioOptionRow: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  radioCopy: { flex: 1, gap: turismoSpacing.xxs },
  description: { ...turismoTypography.caption },
});
