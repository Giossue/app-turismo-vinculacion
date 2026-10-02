import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { RolesGuard } from "../src/auth/roles.guard";
import { AdminEstablishmentsController } from "../src/establishments/establishments.controller";

describe("AdminEstablishmentsController audit", () => {
  it("delegates the establishment audit history by id", async () => {
    const getAudit = vi.fn().mockResolvedValue({ items: [] });
    const controller = new AdminEstablishmentsController({ getAudit } as never);

    await expect(controller.audit("8")).resolves.toEqual({
      data: { items: [] },
    });
    expect(getAudit).toHaveBeenCalledWith("8");
  });

  it("passes the agent scope to the private list", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new AdminEstablishmentsController({ list } as never);

    await controller.list({ limit: 25, offset: 0 }, {
      id: 12,
      roles: ["AGENTE_TURISTICO"],
    } as never);

    expect(list).toHaveBeenCalledWith({ limit: 25, offset: 0 }, 12, false);
  });

  it("delegates review decisions as an administrator", async () => {
    const review = vi.fn().mockResolvedValue({ id: 8 });
    const controller = new AdminEstablishmentsController({ review } as never);

    await expect(
      controller.review(
        "8",
        { action: "REJECT", observation: "Falta verificar la ubicación." },
        { id: 4, roles: ["ADMINISTRADOR"] } as never,
      ),
    ).resolves.toEqual({ data: { id: 8 } });
    expect(review).toHaveBeenCalledWith("8", 4, {
      action: "REJECT",
      observation: "Falta verificar la ubicación.",
    });
  });

  it("delegates logical deletion with the authenticated administrator", async () => {
    const remove = vi.fn().mockResolvedValue({ id: 8, deleted: true });
    const controller = new AdminEstablishmentsController({ remove } as never);

    await expect(
      controller.remove("8", { id: 4, roles: ["ADMINISTRADOR"] } as never),
    ).resolves.toEqual({ data: { id: 8, deleted: true } });
    expect(remove).toHaveBeenCalledWith("8", 4);
  });

  it.each([
    { roles: [] },
    { roles: ["AGENTE_TURISTICO"] },
    { roles: ["TURISTA"] },
  ])(
    "denies deleting a catastro without the administrator role: $roles",
    ({ roles }) => {
      const guard = new RolesGuard(new Reflector());
      const context = {
        getHandler: () => AdminEstablishmentsController.prototype.remove,
        getClass: () => AdminEstablishmentsController,
        switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(
        "No tienes permisos para esta operación.",
      );
    },
  );

  it("allows administrators through the deletion role guard", () => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => AdminEstablishmentsController.prototype.remove,
      getClass: () => AdminEstablishmentsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: ["ADMINISTRADOR"] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
