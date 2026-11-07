import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismFieldError, TourismTextField } from "@/core/ui/tourism-fields";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";
import { useAuth } from "../application/auth-context";
import { useAuthForm } from "../application/use-auth-form";
import {
  deleteAccountFormSchema,
  emptyDeleteAccountForm,
} from "../domain/auth-forms";

/**
 * Explica qué se elimina y pide la contraseña. Al ser un `Modal`, Atrás llega a
 * `onRequestClose` y no a la pantalla, y al cerrarse se desmonta con la clave.
 * Cancelar no envía nada; mientras la solicitud corre no se puede cerrar.
 */
export function DeleteAccountDialog({
  onClose,
  onDeleted,
  onDeletingChange,
}: Readonly<{
  onClose: () => void;
  onDeleted: (cleaned: boolean) => void;
  onDeletingChange: (deleting: boolean) => void;
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const { deleteAccount } = useAuth();
  const text = m.account.profile;
  const form = useAuthForm({
    fallbackError: m.account.errors.deleteAccount,
    initialValues: emptyDeleteAccountForm,
    onSubmit: async ({ password }) => {
      onDeletingChange(true);
      try {
        onDeleted(await deleteAccount(password));
      } catch (error) {
        onDeletingChange(false);
        throw error;
      }
    },
    schema: deleteAccountFormSchema,
  });
  const close = () => {
    if (!form.submitting) onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              {text.deleteTitle}
            </Text>
            <Text style={[styles.warning, { color: colors.danger }]}>
              {text.deleteWarning}
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              {text.deleteRemoved}
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {text.deleteKept}
            </Text>
            <TourismTextField
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              editable={!form.submitting}
              error={form.fieldErrors.password}
              label={text.deletePassword}
              onChangeText={(value) => form.setValue("password", value)}
              required
              secure
              textContentType="password"
              value={form.values.password}
            />
            {form.formError ? (
              <TourismFieldError message={form.formError} />
            ) : null}
            <View style={styles.actions}>
              <TourismActionButton
                disabled={form.submitting || !form.values.password}
                label={form.submitting ? text.deleting : text.deleteConfirm}
                loading={form.submitting}
                mode="outlined"
                onPress={() => void form.submit()}
                style={{ borderColor: colors.danger }}
              />
              <TourismActionButton
                disabled={form.submitting}
                label={text.deleteCancel}
                mode="ghost"
                onPress={close}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: turismoSpacing.lg,
  },
  card: {
    borderRadius: turismoRadii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    maxWidth: turismoMetrics.sheetMaxWidth,
    width: "100%",
  },
  content: { gap: turismoSpacing.md, padding: turismoSpacing.lg },
  title: { ...turismoTypography.heading },
  warning: { ...turismoTypography.label },
  body: { ...turismoTypography.bodySmall },
  actions: { gap: turismoSpacing.xs },
});
