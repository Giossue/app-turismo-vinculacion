import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import {
  TourismActionButton,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  const handleSubmit = async () => {
    if (!email.trim() || password.length < 8) {
      setFormError("Escribe tu correo y una contraseña válida.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await auth.login(email, password);
      router.back();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TourismScreenFrame onBack={handleBack} title="Iniciar sesión">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Text style={[styles.title, { color: colors.text }]}>
              Tu cuenta turística
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Inicia sesión para sincronizar tus lugares guardados.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Correo electrónico
              </Text>
              <TextInput
                accessibilityLabel="Correo electrónico"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.textFaint}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={email}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Contraseña
              </Text>
              <TextInput
                accessibilityLabel="Contraseña"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={password}
              />
            </View>
          </View>

          {formError || auth.error ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {formError ?? auth.error}
            </Text>
          ) : null}

          <TourismActionButton
            disabled={submitting || auth.status === "loading"}
            label={submitting ? "Iniciando sesión…" : "Iniciar sesión"}
            onPress={() => void handleSubmit()}
          />
          {submitting ? <ActivityIndicator color={colors.primary} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  intro: { gap: turismoSpacing.xs },
  title: { ...turismoTypography.title },
  subtitle: { ...turismoTypography.body },
  form: { gap: turismoSpacing.md },
  field: { gap: turismoSpacing.xs },
  label: { ...turismoTypography.label },
  input: {
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    ...turismoTypography.body,
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  error: { ...turismoTypography.label },
});
