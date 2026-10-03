import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { AdminNavigationController } from "../src/admin/admin-navigation.controller";
import { AdminNavigationService } from "../src/admin/admin-navigation.service";
import { RolesGuard } from "../src/auth/roles.guard";

describe("admin navigation endpoint boundaries", () => {
  it.each([
    { roles: ["ADMINISTRADOR"], isAdmin: true },
    { roles: ["AGENTE_TURISTICO"], isAdmin: false },
    { roles: ["ADMINISTRADOR", "AGENTE_TURISTICO"], isAdmin: true },
  ])(
    "uses the authenticated identity and role: $roles",
    async ({ roles, isAdmin }) => {
      const data = { centers: { pending: 4, latestChange: null } };
      const summary = vi.fn().mockResolvedValue(data);
      const controller = new AdminNavigationController({ summary } as never);

      await expect(
        controller.summary({ id: 7, roles } as never),
      ).resolves.toEqual({ data });
      expect(summary).toHaveBeenCalledWith(7, isAdmin);
    },
  );

  it.each([
    { roles: [], allowed: false },
    { roles: ["TURISTA"], allowed: false },
    { roles: ["AGENTE_TURISTICO"], allowed: true },
    { roles: ["ADMINISTRADOR"], allowed: true },
  ])(
    "authorizes the endpoint by operational role: $roles",
    ({ roles, allowed }) => {
      const guard = new RolesGuard(new Reflector());
      const context = {
        getHandler: () => AdminNavigationController.prototype.summary,
        getClass: () => AdminNavigationController,
        switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
      } as unknown as ExecutionContext;
      if (allowed) expect(guard.canActivate(context)).toBe(true);
      else
        expect(() => guard.canActivate(context)).toThrow("No tienes permisos");
    },
  );

  it("returns only counters and ISO dates and redacts administrator-only sections for agents", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        section: "centers",
        pending: "3",
        latestChange: new Date("2026-10-04T03:00:00Z"),
      },
      { section: "establishments", pending: "2", latestChange: null },
      { section: "review", pending: 99, latestChange: "2026-10-04T12:00:00Z" },
      {
        section: "opinions",
        pending: 99,
        latestChange: "2026-10-04T12:00:00Z",
      },
      {
        section: "catalogs",
        pending: 99,
        latestChange: "2026-10-04T12:00:00Z",
      },
    ]);
    const service = new AdminNavigationService({ query } as never);
    expect(await service.summary(7, false)).toEqual({
      centers: { pending: 3, latestChange: "2026-10-04T03:00:00.000Z" },
      establishments: { pending: 2, latestChange: null },
      review: { pending: 0, latestChange: null },
      opinions: { pending: 0, latestChange: null },
      catalogs: { pending: 0, latestChange: null },
    });
    expect(query).toHaveBeenCalledWith(expect.any(String), [7, false]);
  });
});
