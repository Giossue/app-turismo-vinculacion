import { describe, expect, it } from "vitest";

import { getBirthDateBounds } from "./birth-date";
import {
  emptyRegistrationForm,
  getFieldErrors,
  loginFormSchema,
  passwordRequirementMessage,
  PASSWORD_MAX_LENGTH,
  registrationFormSchema,
} from "./auth-forms";

const validRegistration = {
  ...emptyRegistrationForm,
  birthDate: new Date(1998, 1, 3),
  email: "  turista@mail.com ",
  gender: "Femenino" as const,
  name: "  Ana Pérez ",
  password: "una-clave-segura",
  passwordConfirmation: "una-clave-segura",
};

describe("login form", () => {
  it("trims the email and keeps the password untouched", () => {
    expect(
      loginFormSchema.parse({
        email: " turista@mail.com ",
        password: " clave123 ",
      }),
    ).toEqual({ email: "turista@mail.com", password: " clave123 " });
  });

  it("explains empty, invalid and short values", () => {
    const empty = loginFormSchema.safeParse({ email: "", password: "" });
    expect(empty.success).toBe(false);
    expect(getFieldErrors(empty.error!)).toEqual({
      email: "Escribe tu correo electrónico.",
      password: "Escribe tu contraseña.",
    });

    const invalid = loginFormSchema.safeParse({
      email: "turista",
      password: "corta",
    });
    expect(getFieldErrors(invalid.error!)).toEqual({
      email: "Escribe un correo electrónico válido.",
      password: "La contraseña tiene al menos 8 caracteres.",
    });
  });
});

describe("registration form", () => {
  it("produces the API registration input", () => {
    expect(registrationFormSchema.parse(validRegistration)).toEqual({
      birthDate: "1998-02-03",
      email: "turista@mail.com",
      gender: "Femenino",
      name: "Ana Pérez",
      password: "una-clave-segura",
    });
  });

  it("reports every invalid field at once", () => {
    const result = registrationFormSchema.safeParse({
      ...emptyRegistrationForm,
      email: "no-es-correo",
      name: " A ",
      password: "corta",
      passwordConfirmation: "otra",
    });
    expect(result.success).toBe(false);
    expect(getFieldErrors(result.error!)).toEqual({
      birthDate: "Selecciona tu fecha de nacimiento.",
      email: "Escribe un correo electrónico válido.",
      gender: "Selecciona tu género.",
      name: "Escribe tu nombre.",
      password: passwordRequirementMessage,
    });
  });

  it("checks the confirmation and the password limits", () => {
    const mismatch = registrationFormSchema.safeParse({
      ...validRegistration,
      passwordConfirmation: "una-clave-distinta",
    });
    expect(getFieldErrors(mismatch.error!)).toEqual({
      passwordConfirmation: "Las contraseñas no coinciden.",
    });

    const tooLong = "x".repeat(PASSWORD_MAX_LENGTH + 1);
    const long = registrationFormSchema.safeParse({
      ...validRegistration,
      password: tooLong,
      passwordConfirmation: tooLong,
    });
    expect(getFieldErrors(long.error!)).toEqual({
      password: "La contraseña no puede superar 128 caracteres.",
    });
  });

  it("rejects birth dates outside the accepted ages", () => {
    const { maximumDate } = getBirthDateBounds();
    const tooYoung = new Date(maximumDate);
    tooYoung.setDate(tooYoung.getDate() + 1);

    const result = registrationFormSchema.safeParse({
      ...validRegistration,
      birthDate: tooYoung,
    });
    expect(getFieldErrors(result.error!)).toEqual({
      birthDate: "Fecha inválida.",
    });
  });
});
