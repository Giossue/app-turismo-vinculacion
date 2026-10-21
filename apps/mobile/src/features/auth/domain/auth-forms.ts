import { z } from "zod";

import { toIsoDate } from "@/core/format/date";
import { isValidBirthDate } from "./birth-date";
import {
  touristGenderOptions,
  type TouristGender,
  type TouristRegistrationInput,
} from "./registration-options";
import { messages } from "@/core/i18n/language";

// Limits mirror the API's LoginDto and RegisterDto (apps/api/src/auth).
const LOGIN_PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;
const EMAIL_MAX_LENGTH = 254;

/** Shown as helper text under the password of a new account. */
export function getPasswordRequirementMessage(): string {
  return messages().account.validation.passwordRequirement(PASSWORD_MIN_LENGTH);
}

// Los mensajes se resuelven al validar para seguir el idioma activo.
const v = () => messages().account.validation;

// Trimming happens only here: the API receives the parsed values.
const emailSchema = z
  .string()
  .trim()
  .min(1, { error: () => v().emailRequired })
  .max(EMAIL_MAX_LENGTH, { error: () => v().emailTooLong })
  .pipe(z.email({ error: () => v().emailInvalid }));

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { error: () => v().passwordRequired })
    .min(LOGIN_PASSWORD_MIN_LENGTH, {
      error: () => v().passwordLoginMin(LOGIN_PASSWORD_MIN_LENGTH),
    }),
});

export const registrationFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, { error: () => v().nameRequired })
      .max(NAME_MAX_LENGTH, { error: () => v().nameTooLong }),
    email: emailSchema,
    gender: z.enum(touristGenderOptions, { error: () => v().genderRequired }),
    birthDate: z
      .date({ error: () => v().birthDateRequired })
      .refine((date) => isValidBirthDate(date), {
        error: () => v().birthDateInvalid,
      }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, { error: getPasswordRequirementMessage })
      .max(PASSWORD_MAX_LENGTH, {
        error: () => v().passwordTooLong(PASSWORD_MAX_LENGTH),
      }),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    error: () => v().passwordMismatch,
    path: ["passwordConfirmation"],
  })
  .transform(
    ({
      birthDate,
      email,
      gender,
      name,
      password,
    }): TouristRegistrationInput => ({
      birthDate: toIsoDate(birthDate),
      email,
      gender,
      name,
      password,
    }),
  );

export type LoginFormValues = Readonly<{ email: string; password: string }>;

/** What the registration form holds before validation. */
export type RegistrationFormValues = Readonly<{
  birthDate: Date | null;
  email: string;
  gender: TouristGender | null;
  name: string;
  password: string;
  passwordConfirmation: string;
}>;

export const emptyLoginForm: LoginFormValues = { email: "", password: "" };

export const emptyRegistrationForm: RegistrationFormValues = {
  birthDate: null,
  email: "",
  gender: null,
  name: "",
  password: "",
  passwordConfirmation: "",
};

/** The first message of each invalid field, keyed by field name. */
export function getFieldErrors<TField extends string>(
  error: z.ZodError,
): Partial<Record<TField, string>> {
  const errors: Partial<Record<TField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    const key = field as TField;
    errors[key] ??= issue.message;
  }
  return errors;
}
