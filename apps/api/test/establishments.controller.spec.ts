import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { RolesGuard } from "../src/auth/roles.guard";
import { AdminEstablishmentsController } from "../src/establishments/establishments.controller";

describe("AdminEstablishmentsController audit", () => {
  it("delegates the establishment audit history by id", async () => {
    const getAudit = vi.fn().mockResolvedValue({ items: [] });
    const controller = new AdminEstablishmentsController(
      { getAudit } as never,
      {} as never,
    );

    await expect(controller.audit("8")).resolves.toEqual({
      data: { items: [] },
    });
    expect(getAudit).toHaveBeenCalledWith("8");
  });

  it("passes the agent scope to the private list", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new AdminEstablishmentsController(
      { list } as never,
      {} as never,
    );

    await controller.list({ limit: 25, offset: 0 }, {
      id: 12,
      roles: ["AGENTE_TURISTICO"],
    } as never);

    expect(list).toHaveBeenCalledWith({ limit: 25, offset: 0 }, 12, false);
  });

  it("delegates review decisions as an administrator", async () => {
    const review = vi.fn().mockResolvedValue({ id: 8 });
    const controller = new AdminEstablishmentsController(
      { review } as never,
      {} as never,
    );

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
    const controller = new AdminEstablishmentsController(
      { remove } as never,
      {} as never,
    );

    await expect(
      controller.remove("8", { id: 4, roles: ["ADMINISTRADOR"] } as never),
    ).resolves.toEqual({ data: { id: 8, deleted: true } });
    expect(remove).toHaveBeenCalledWith("8", 4, true);
  });

  it("lets an agent delete only through the ownership check in the service", async () => {
    const remove = vi.fn().mockResolvedValue({ id: 8, deleted: true });
    const controller = new AdminEstablishmentsController(
      { remove } as never,
      {} as never,
    );

    await controller.remove("8", {
      id: 5,
      roles: ["AGENTE_TURISTICO"],
    } as never);

    expect(remove).toHaveBeenCalledWith("8", 5, false);
  });

  describe("delete role guard", () => {
    const context = (roles: string[]) =>
      ({
        getHandler: () => AdminEstablishmentsController.prototype.remove,
        getClass: () => AdminEstablishmentsController,
        switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
      }) as unknown as ExecutionContext;

    it.each([[[]], [["TURISTA"]]])(
      "denies deleting a catastro to %j",
      (roles) => {
        expect(() =>
          new RolesGuard(new Reflector()).canActivate(context(roles)),
        ).toThrow("No tienes permisos para esta operación.");
      },
    );

    it.each([["ADMINISTRADOR"], ["AGENTE_TURISTICO"]])(
      "lets %s reach the handler",
      (role) => {
        expect(
          new RolesGuard(new Reflector()).canActivate(context([role])),
        ).toBe(true);
      },
    );
  });

  it.each(["importRegistry", "importStatus"] as const)(
    "reserves the MINTUR registry import (%s) for administrators",
    (handler) => {
      const guard = new RolesGuard(new Reflector());
      const context = {
        getHandler: () => AdminEstablishmentsController.prototype[handler],
        getClass: () => AdminEstablishmentsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { roles: ["AGENTE_TURISTICO"] } }),
        }),
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

describe("AdminEstablishmentsController direct publication", () => {
  const agent = { id: 12, roles: ["AGENTE_TURISTICO"] } as never;

  it("keeps the review for agents unless the administrator opened the way", async () => {
    const submitReview = vi.fn().mockResolvedValue({ id: 8 });
    const settings = {
      get: vi.fn().mockResolvedValue({ directPublishCatastros: false }),
    };
    const controller = new AdminEstablishmentsController(
      { submitReview } as never,
      {} as never,
      settings as never,
    );

    await controller.submitReview("8", agent);

    expect(submitReview).toHaveBeenCalledWith("8", 12, false, false);
  });

  it("publishes the agent's submission right away when the setting is on", async () => {
    const submitReview = vi.fn().mockResolvedValue({ id: 8 });
    const settings = {
      get: vi.fn().mockResolvedValue({ directPublishCatastros: true }),
    };
    const controller = new AdminEstablishmentsController(
      { submitReview } as never,
      {} as never,
      settings as never,
    );

    await controller.submitReview("8", agent);

    expect(submitReview).toHaveBeenCalledWith("8", 12, false, true);
  });
});
