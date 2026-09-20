import { describe, expect, it, vi } from "vitest";

import { loginMobile, refreshMobile } from "./auth-api";

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
});
