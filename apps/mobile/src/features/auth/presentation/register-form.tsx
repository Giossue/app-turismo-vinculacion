import { useRef } from "react";
import { StyleSheet, View, type TextInput } from "react-native";

import { TourismDateField } from "@/core/ui/tourism-date-field";
import {
  TourismRadioGroup,
  TourismTextField,
  type TourismRadioOption,
} from "@/core/ui/tourism-fields";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "../application/auth-context";
import { useAuthForm } from "../application/use-auth-form";
import {
  emptyRegistrationForm,
  passwordRequirementMessage,
  registrationFormSchema,
} from "../domain/auth-forms";
import { getBirthDateBounds } from "../domain/birth-date";
import {
  touristGenderOptions,
  type TouristGender,
} from "../domain/registration-options";
import { AuthFormActions } from "./auth-form-actions";

const genderOptions: readonly TourismRadioOption<TouristGender>[] =
  touristGenderOptions.map((gender) => ({
    icon: gender === "Masculino" ? "genderMale" : "genderFemale",
    label: gender,
    value: gender,
  }));

export function RegisterForm({
  onSignedIn,
  onSwitchMode,
}: Readonly<{ onSignedIn: () => void; onSwitchMode: () => void }>) {
  const auth = useAuth();
  const emailRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const { maximumDate, minimumDate } = getBirthDateBounds();
  const form = useAuthForm({
    fallbackError: "No se pudo crear la cuenta.",
    initialValues: emptyRegistrationForm,
    onSubmit: async (input) => {
      await auth.register(input);
      onSignedIn();
    },
    schema: registrationFormSchema,
  });

  return (
    <View style={styles.form}>
      <TourismTextField
        autoCapitalize="words"
        autoComplete="name"
        error={form.fieldErrors.name}
        label="Nombre completo"
        onChangeText={(value) => form.setValue("name", value)}
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="Tu nombre"
        required
        returnKeyType="next"
        submitBehavior="submit"
        textContentType="name"
        value={form.values.name}
      />
      <TourismTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={form.fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={(value) => form.setValue("email", value)}
        placeholder="tu@correo.com"
        ref={emailRef}
        required
        returnKeyType="done"
        textContentType="emailAddress"
        value={form.values.email}
      />
      <TourismRadioGroup
        error={form.fieldErrors.gender}
        label="Género"
        onChange={(value) => form.setValue("gender", value)}
        options={genderOptions}
        required
        value={form.values.gender}
      />
      <TourismDateField
        error={form.fieldErrors.birthDate}
        label="Fecha de nacimiento"
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onChange={(date) => form.setValue("birthDate", date)}
        required
        value={form.values.birthDate}
      />
      <TourismTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={form.fieldErrors.password}
        helper={passwordRequirementMessage}
        label="Contraseña"
        onChangeText={(value) => form.setValue("password", value)}
        onSubmitEditing={() => confirmationRef.current?.focus()}
        placeholder="Tu contraseña"
        required
        returnKeyType="next"
        secure
        submitBehavior="submit"
        textContentType="newPassword"
        value={form.values.password}
      />
      <TourismTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={form.fieldErrors.passwordConfirmation}
        label="Repetir contraseña"
        onChangeText={(value) => form.setValue("passwordConfirmation", value)}
        onSubmitEditing={() => void form.submit()}
        placeholder="Repite tu contraseña"
        ref={confirmationRef}
        required
        returnKeyType="go"
        secure
        textContentType="newPassword"
        value={form.values.passwordConfirmation}
      />
      <AuthFormActions
        disabled={auth.status === "loading"}
        error={form.formError}
        onSubmit={() => void form.submit()}
        onSwitchMode={onSwitchMode}
        submitLabel="Crear cuenta"
        submitting={form.submitting}
        submittingLabel="Creando cuenta…"
        switchLabel="¿Ya tienes cuenta? Iniciar sesión"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: turismoSpacing.md },
});
