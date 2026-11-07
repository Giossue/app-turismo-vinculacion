import { describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../src/auth/auth.guard";
import { RolesGuard } from "../src/auth/roles.guard";

function contextFor(request: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe("AuthGuard", () => {
  it("rejects requests without a bearer token", async () => {
    const guard = new AuthGuard(
      { verifyAccessToken: vi.fn() } as never,
      { query: vi.fn() } as never,
    );
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow("Se requiere una sesión autenticada.");
  });

  it("attaches verified identity claims to the request", async () => {
    const guard = new AuthGuard(
      {
        verifyAccessToken: vi.fn().mockResolvedValue({
          sub: "12",
          sid: "session-id",
          roles: ["ADMINISTRADOR"],
        }),
      } as never,
      { query: vi.fn().mockResolvedValue([{ id: "12" }]) } as never,
    );
    const request = { headers: { authorization: "Bearer access-token" } } as {
      headers: { authorization: string };
      user?: unknown;
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: 12,
      roles: ["ADMINISTRADOR"],
      sessionId: "session-id",
    });
  });
});

describe("AuthGuard after an account deletion", () => {
  function guardWithAccount(query: ReturnType<typeof vi.fn>) {
    return new AuthGuard(
      {
        verifyAccessToken: vi.fn().mockResolvedValue({
          sub: "12",
          sid: "session-id",
          roles: ["TURISTA"],
        }),
      } as never,
      { query } as never,
    );
  }

  it("rejects a still-valid token of a deleted account", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const request = { headers: { authorization: "Bearer access-token" } };

    await expect(
      guardWithAccount(query).canActivate(contextFor(request)),
    ).rejects.toThrow("La cuenta no está activa.");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("eliminado_at IS NULL"),
      [12],
    );
  });

  it("does not turn a database outage into an expired session", async () => {
    const query = vi.fn().mockRejectedValue(new Error("connection lost"));
    const request = { headers: { authorization: "Bearer access-token" } };

    await expect(
      guardWithAccount(query).canActivate(contextFor(request)),
    ).rejects.toThrow("connection lost");
  });
});

describe("RolesGuard", () => {
  it("denies a valid session without the required role", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["ADMINISTRADOR"]),
    };
    const guard = new RolesGuard(reflector as never);
    expect(() =>
      guard.canActivate(contextFor({ user: { roles: ["TURISTA"] } })),
    ).toThrow("No tienes permisos para esta operación.");
  });
});
