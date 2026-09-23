import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, StyleSheet, Text, View } from "react-native";

import { formatLongDate } from "@/core/format/date";
import { useTurismoPalette } from "./theme-context";
import { TourismActionButton, TourismIconAction } from "./tourism-controls";
import { TourismFieldError, TourismFieldLabel } from "./tourism-fields";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/**
 * Date input backed by the native calendar: Android opens its dialog and
 * iOS shows an inline calendar in a bottom modal. The picker never offers a
 * day outside `minimumDate`–`maximumDate`.
 */
export function TourismDateField({
  error,
  label,
  maximumDate,
  minimumDate,
  onChange,
  placeholder = "Selecciona una fecha",
  required = false,
  value,
}: Readonly<{
  error?: string | null;
  label: string;
  maximumDate: Date;
  minimumDate: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  required?: boolean;
  value: Date | null;
}>) {
  const colors = useTurismoPalette();
  const [open, setOpen] = useState(false);
  const pickerValue = clampDate(value ?? maximumDate, minimumDate, maximumDate);
  const close = () => setOpen(false);

  const handleValueChange = (
    _event: DateTimePickerChangeEvent,
    date: Date,
  ) => {
    // The Android dialog closes itself on selection; iOS stays open.
    if (Platform.OS !== "ios") setOpen(false);
    onChange(date);
  };

  return (
    <View style={styles.field}>
      <TourismFieldLabel label={label} required={required} />
      <TourismPressable
        accessibilityHint={error ?? undefined}
        accessibilityLabel={
          value
            ? `${label}: ${formatLongDate(value)}`
            : `Elegir ${label.toLowerCase()}`
        }
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[
          styles.dateButton,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <TurismoIcon
          color={colors.primaryStrong}
          name="calendar"
          size={turismoIconSizes.md}
        />
        <Text
          style={[
            styles.dateText,
            { color: value ? colors.text : colors.textFaint },
          ]}
        >
          {value ? formatLongDate(value) : placeholder}
        </Text>
      </TourismPressable>
      {error ? <TourismFieldError message={error} /> : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          display="calendar"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode="date"
          onDismiss={close}
          onValueChange={handleValueChange}
          value={pickerValue}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="slide"
          onRequestClose={close}
          transparent
          visible={open}
        >
          <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
            <View
              style={[
                styles.sheet,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text
                  accessibilityRole="header"
                  style={[styles.sheetTitle, { color: colors.text }]}
                >
                  {label}
                </Text>
                <TourismIconAction
                  accessibilityLabel="Cerrar selector de fecha"
                  icon="close"
                  onPress={close}
                  variant="ghost"
                />
              </View>
              <DateTimePicker
                display="inline"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                mode="date"
                onDismiss={close}
                onValueChange={handleValueChange}
                value={pickerValue}
              />
              <TourismActionButton label="Listo" onPress={close} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function clampDate(date: Date, minimum: Date, maximum: Date): Date {
  if (date < minimum) return minimum;
  if (date > maximum) return maximum;
  return date;
}

const styles = StyleSheet.create({
  field: { gap: turismoSpacing.xs },
  dateButton: {
    alignItems: "center",
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
  },
  dateText: { ...turismoTypography.body },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.md,
    padding: turismoSpacing.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetTitle: { ...turismoTypography.heading },
});
