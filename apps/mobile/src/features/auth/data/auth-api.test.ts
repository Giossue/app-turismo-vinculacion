import { describe, expect, it, vi } from "vitest";

import { loginMobile, refreshMobile, registerMobile } from "./auth-api";

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
      registerMobile(
        {
          birthDate: "1998-02-03",
          email: "ana@example.com",
          gender: "Femenino",
          name: "Ana Pérez",
          password: "a-secure-password",
        },
        fetcher,
        "http://api.test/api/v1",
      ),
    ).resolves.toMatchObject({ user: { roles: ["TURISTA"] } });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/mobile/register",
      expect.objectContaining({ method: "POST" }),
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
