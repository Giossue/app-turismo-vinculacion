import { afterEach, describe, expect, it, vi } from "vitest";

import { setLanguage } from "@/core/i18n/language";
import {
  acceptLegalDocuments,
  deleteAccount,
  getSessionUser,
  loginMobile,
  refreshMobile,
  registerMobile,
} from "./auth-api";
import { CodedApiError, isLegalVersionOutdatedError } from "./coded-api-error";

const authResponse = {
  data: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: 7,
      name: "Turista",
      email: "turista@mail.com",
      roles: ["TURISTA"],
    },
  },
};

const apiUrl = "http://api.test/api/v1";
const registration = {
  acceptedLegal: { terms: "2026-11", privacy: "2026-12" },
  appVersion: "1.4.0",
  birthDate: "1998-02-03",
  email: "ana@example.com",
  gender: "Femenino",
  name: "Ana Pérez",
  password: "a-secure-password",
} as const;

const failingFetcher = (status: number, code: string, message: string) =>
  vi.fn(async () => Response.json({ error: { code, message } }, { status }));

const sentBody = (fetcher: { mock: { calls: unknown[][] } }) =>
  JSON.parse((fetcher.mock.calls[0][1] as RequestInit).body as string);

describe("mobile auth API", () => {
  it("sends credentials only to the mobile login contract", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => authResponse,
    });

    await expect(
      loginMobile(
        "turista@mail.com",
        "password123",
        fetcher,
        "http://api.test/api/v1",
      ),
    ).resolves.toMatchObject({ accessToken: "access-token" });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/mobile/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects a malformed refresh response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { accessToken: "only-access" } }),
    });

    await expect(
      refreshMobile("refresh-token", fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("formato válido");
  });

  it("uses the tourist registration contract", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => authResponse,
    });

    await expect(
      registerMobile(registration, fetcher, "http://api.test/api/v1"),
    ).resolves.toMatchObject({ user: { roles: ["TURISTA"] } });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/mobile/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends the accepted versions and the app version in the registration", async () => {
    const fetcher = vi.fn(async () => Response.json(authResponse));

    await registerMobile(registration, fetcher, apiUrl);

    expect(sentBody(fetcher)).toEqual(registration);
  });
});

describe("mobile auth API error codes", () => {
  afterEach(() => setLanguage("es"));

  it("translates an outdated legal version in every language", async () => {
    setLanguage("en");
    const error = await registerMobile(
      registration,
      failingFetcher(409, "LEGAL_VERSION_OUTDATED", "Mensaje del servidor."),
      apiUrl,
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(CodedApiError);
    expect(error).toMatchObject({
      code: "LEGAL_VERSION_OUTDATED",
      message: "The legal documents changed. Review and accept them again.",
      status: 409,
    });
    expect(isLegalVersionOutdatedError(error)).toBe(true);
  });

  it("explains the minimum age when the API rejects the birth date", async () => {
    await expect(
      registerMobile(
        registration,
        failingFetcher(400, "UNDERAGE", "Mensaje del servidor."),
        apiUrl,
      ),
    ).rejects.toMatchObject({
      code: "UNDERAGE",
      message: "Debes tener al menos 15 años para crear una cuenta.",
      status: 400,
    });
  });

  it("keeps the server message for a code the app does not know", async () => {
    const error = await registerMobile(
      registration,
      failingFetcher(400, "HTTP_400", "Los datos no son válidos."),
      apiUrl,
    ).catch((reason: unknown) => reason);

    expect(error).not.toBeInstanceOf(CodedApiError);
    expect(error).toMatchObject({
      message: "Los datos no son válidos.",
      status: 400,
    });
    expect(isLegalVersionOutdatedError(error)).toBe(false);
  });

  it("survives an error body that is not JSON", async () => {
    await expect(
      registerMobile(
        registration,
        vi.fn(async () => new Response("Bad gateway", { status: 502 })),
        apiUrl,
      ),
    ).rejects.toMatchObject({
      message: "No se pudo crear la cuenta.",
      status: 502,
    });
  });
});

describe("legal acceptance API", () => {
  it("sends only the pending versions and returns what is still pending", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: { pendingLegalDocuments: [] } }),
    );

    await expect(
      acceptLegalDocuments(
        { acceptedLegal: { privacy: "2026-12" }, appVersion: "1.4.0" },
        fetcher,
        apiUrl,
      ),
    ).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledWith(
      `${apiUrl}/auth/legal-acceptances`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(sentBody(fetcher)).toEqual({
      acceptedLegal: { privacy: "2026-12" },
      appVersion: "1.4.0",
    });
  });

  it("reports an outdated version with its code", async () => {
    const error = await acceptLegalDocuments(
      { acceptedLegal: { terms: "2026-11" } },
      failingFetcher(409, "LEGAL_VERSION_OUTDATED", "Versión vieja."),
      apiUrl,
    ).catch((reason: unknown) => reason);

    expect(isLegalVersionOutdatedError(error)).toBe(true);
  });

  it("uses a generic message when the acceptance cannot be saved", async () => {
    await expect(
      acceptLegalDocuments(
        { acceptedLegal: { terms: "2026-11" } },
        vi.fn().mockRejectedValue(new TypeError("Network request failed")),
        apiUrl,
      ),
    ).rejects.toThrow("No se pudo guardar tu aceptación.");
  });
});

describe("session query", () => {
  it("reads the current profile with its pending documents", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        data: {
          user: {
            ...authResponse.data.user,
            pendingLegalDocuments: ["terms"],
          },
        },
      }),
    );

    await expect(getSessionUser(fetcher, apiUrl)).resolves.toMatchObject({
      pendingLegalDocuments: ["terms"],
    });
    expect(fetcher.mock.calls[0]).toContainEqual(`${apiUrl}/auth/me`);
  });
});

describe("account deletion API", () => {
  it("sends the password to the deletion contract", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: { deleted: true } }),
    );

    await expect(
      deleteAccount("la-contraseña", fetcher, apiUrl),
    ).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      `${apiUrl}/auth/account/delete`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(sentBody(fetcher)).toEqual({ password: "la-contraseña" });
  });

  it.each([
    [400, "INVALID_PASSWORD", "La contraseña no es correcta."],
    [
      403,
      "ACCOUNT_NOT_DELETABLE",
      "Esta cuenta institucional no se puede eliminar desde la app.",
    ],
  ])("maps %i %s to its own message", async (status, code, message) => {
    await expect(
      deleteAccount("clave", failingFetcher(status, code, "Otro."), apiUrl),
    ).rejects.toMatchObject({ code, message, status });
  });

  it.each([
    ["a server failure", failingFetcher(500, "INTERNAL_ERROR", "Falló.")],
    [
      "a network failure",
      vi.fn().mockRejectedValue(new TypeError("Network request failed")),
    ],
  ])("uses a generic message for %s", async (_name, fetcher) => {
    await expect(deleteAccount("clave", fetcher, apiUrl)).rejects.toThrow(
      "No se pudo eliminar la cuenta.",
    );
  });
});

describe("mobile auth API errors", () => {
  it("shows the API's message for rejected credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Credenciales inválidas." } }),
    });

    await expect(
      loginMobile("turista@mail.com", "bad", fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("Credenciales inválidas.");
  });

  it("does not leak transport errors", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));

    await expect(
      loginMobile("turista@mail.com", "x", fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("No se pudo iniciar sesión.");
  });
});
