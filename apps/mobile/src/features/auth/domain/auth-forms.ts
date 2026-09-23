import { z } from "zod";

import { toIsoDate } from "@/core/format/date";
import { isValidBirthDate } from "./birth-date";
import {
  touristGenderOptions,
  type TouristGender,
  type TouristRegistrationInput,
} from "./registration-options";

// Limits mirror the API's LoginDto and RegisterDto (apps/api/src/auth).
export const LOGIN_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 150;
export const EMAIL_MAX_LENGTH = 254;

/** Shown as helper text under the password of a new account. */
export const passwordRequirementMessage = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;

// Trimming happens only here: the API receives the parsed values.
const emailSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu correo electrónico.")
  .max(EMAIL_MAX_LENGTH, "El correo electrónico es demasiado largo.")
  .pipe(z.email({ error: "Escribe un correo electrónico válido." }));

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Escribe tu contraseña.")
    .min(
      LOGIN_PASSWORD_MIN_LENGTH,
      `La contraseña tiene al menos ${LOGIN_PASSWORD_MIN_LENGTH} caracteres.`,
    ),
});

export const registrationFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, "Escribe tu nombre.")
      .max(NAME_MAX_LENGTH, "El nombre es demasiado largo."),
    email: emailSchema,
    gender: z.enum(touristGenderOptions, { error: "Selecciona tu género." }),
    birthDate: z
      .date({ error: "Selecciona tu fecha de nacimiento." })
      .refine((date) => isValidBirthDate(date), "Fecha inválida."),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, passwordRequirementMessage)
      .max(
        PASSWORD_MAX_LENGTH,
        `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
      ),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
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
export type LoginCredentials = z.infer<typeof loginFormSchema>;

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
