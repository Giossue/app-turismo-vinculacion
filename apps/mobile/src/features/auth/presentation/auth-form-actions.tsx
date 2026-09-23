import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismFieldError } from "@/core/ui/tourism-fields";
import { turismoSpacing } from "@/core/ui/tokens";

/** Error, submit button and the link to the other form. */
export function AuthFormActions({
  disabled,
  error,
  onSubmit,
  onSwitchMode,
  submitLabel,
  submitting,
  submittingLabel,
  switchLabel,
}: Readonly<{
  disabled: boolean;
  error: string | null;
  onSubmit: () => void;
  onSwitchMode: () => void;
  submitLabel: string;
  submitting: boolean;
  submittingLabel: string;
  switchLabel: string;
}>) {
  return (
    <View style={styles.actions}>
      {error ? <TourismFieldError message={error} /> : null}
      <TourismActionButton
        disabled={disabled || submitting}
        label={submitting ? submittingLabel : submitLabel}
        loading={submitting}
        onPress={onSubmit}
      />
      <TourismActionButton
        label={switchLabel}
        mode="ghost"
        onPress={onSwitchMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: turismoSpacing.md },
});
