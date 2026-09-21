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
    const guard = new AuthGuard({ verifyAccessToken: vi.fn() } as never);
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow("Se requiere una sesión autenticada.");
  });

  it("attaches verified identity claims to the request", async () => {
    const guard = new AuthGuard({
      verifyAccessToken: vi.fn().mockResolvedValue({
        sub: "12",
        sid: "session-id",
        roles: ["ADMINISTRADOR"],
      }),
    } as never);
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
