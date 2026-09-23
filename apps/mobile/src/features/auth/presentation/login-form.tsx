import { useRef } from "react";
import { StyleSheet, View, type TextInput } from "react-native";

import { TourismTextField } from "@/core/ui/tourism-fields";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "../application/auth-context";
import { useAuthForm } from "../application/use-auth-form";
import { emptyLoginForm, loginFormSchema } from "../domain/auth-forms";
import { AuthFormActions } from "./auth-form-actions";

export function LoginForm({
  onSignedIn,
  onSwitchMode,
}: Readonly<{ onSignedIn: () => void; onSwitchMode: () => void }>) {
  const auth = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const form = useAuthForm({
    fallbackError: "No se pudo iniciar sesión.",
    initialValues: emptyLoginForm,
    onSubmit: async ({ email, password }) => {
      await auth.login(email, password);
      onSignedIn();
    },
    schema: loginFormSchema,
  });

  return (
    <View style={styles.form}>
      <TourismTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={form.fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={(value) => form.setValue("email", value)}
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="tu@correo.com"
        required
        returnKeyType="next"
        submitBehavior="submit"
        textContentType="emailAddress"
        value={form.values.email}
      />
      <TourismTextField
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect={false}
        error={form.fieldErrors.password}
        label="Contraseña"
        onChangeText={(value) => form.setValue("password", value)}
        onSubmitEditing={() => void form.submit()}
        placeholder="Tu contraseña"
        ref={passwordRef}
        required
        returnKeyType="go"
        secure
        textContentType="password"
        value={form.values.password}
      />
      <AuthFormActions
        disabled={auth.status === "loading"}
        error={form.formError}
        onSubmit={() => void form.submit()}
        onSwitchMode={onSwitchMode}
        submitLabel="Iniciar sesión"
        submitting={form.submitting}
        submittingLabel="Iniciando sesión…"
        switchLabel="¿Aún no tienes cuenta? Crear cuenta"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: turismoSpacing.md },
});
