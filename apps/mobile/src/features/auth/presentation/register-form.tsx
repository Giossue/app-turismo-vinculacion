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
  getPasswordRequirementMessage,
  registrationFormSchema,
} from "../domain/auth-forms";
import { getBirthDateBounds } from "../domain/birth-date";
import {
  touristGenderOptions,
  type TouristGender,
} from "../domain/registration-options";
import { AuthFormActions } from "./auth-form-actions";
import { useMessages } from "@/core/i18n/use-language";
import { messages } from "@/core/i18n/language";

const getGenderOptions = (): readonly TourismRadioOption<TouristGender>[] =>
  touristGenderOptions.map((gender) => ({
    icon: gender === "Masculino" ? "genderMale" : "genderFemale",
    label: messages().account.login.genders[gender],
    value: gender,
  }));

export function RegisterForm({
  onSignedIn,
  onSwitchMode,
}: Readonly<{ onSignedIn: () => void; onSwitchMode: () => void }>) {
  const m = useMessages();
  const auth = useAuth();
  const emailRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const { maximumDate, minimumDate } = getBirthDateBounds();
  const form = useAuthForm({
    fallbackError: m.account.errors.register,
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
        label={m.account.login.name}
        onChangeText={(value) => form.setValue("name", value)}
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder={m.account.login.namePlaceholder}
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
        label={m.account.login.email}
        onChangeText={(value) => form.setValue("email", value)}
        placeholder={m.account.login.emailPlaceholder}
        ref={emailRef}
        required
        returnKeyType="done"
        textContentType="emailAddress"
        value={form.values.email}
      />
      <TourismRadioGroup
        error={form.fieldErrors.gender}
        label={m.account.login.gender}
        onChange={(value) => form.setValue("gender", value)}
        options={getGenderOptions()}
        required
        value={form.values.gender}
      />
      <TourismDateField
        error={form.fieldErrors.birthDate}
        label={m.account.login.birthDate}
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
        helper={getPasswordRequirementMessage()}
        label={m.account.login.password}
        onChangeText={(value) => form.setValue("password", value)}
        onSubmitEditing={() => confirmationRef.current?.focus()}
        placeholder={m.account.login.passwordPlaceholder}
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
        label={m.account.login.passwordConfirmation}
        onChangeText={(value) => form.setValue("passwordConfirmation", value)}
        onSubmitEditing={() => void form.submit()}
        placeholder={m.account.login.passwordConfirmationPlaceholder}
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
        submitLabel={m.account.login.createAccount}
        submitting={form.submitting}
        submittingLabel={m.account.login.creatingAccount}
        switchLabel={m.account.login.switchToLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: turismoSpacing.md },
});
