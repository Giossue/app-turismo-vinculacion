import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../src/auth/auth.guard";
import type { AuthRole } from "../src/auth/auth.types";
import { RolesGuard } from "../src/auth/roles.guard";
import { AdminOpinionsController } from "../src/opinions/opinions.controller";

const reviewCode = "11111111-1111-4111-8111-111111111111";

function contextFor(roles?: AuthRole[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: roles ? { roles } : undefined }),
    }),
    getHandler: () => AdminOpinionsController.prototype.remove,
    getClass: () => AdminOpinionsController,
  } as unknown as ExecutionContext;
}

describe("AdminOpinionsController deletion", () => {
  it("keeps authentication and role guards on the administrative boundary", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminOpinionsController),
    ).toEqual([AuthGuard, RolesGuard]);
  });

  it.each([undefined, ["TURISTA"], ["AGENTE_TURISTICO"]] as const)(
    "denies deletion to a session without administrator permissions (%s)",
    (roles) => {
      const guard = new RolesGuard(new Reflector());
      expect(() => guard.canActivate(contextFor(roles && [...roles]))).toThrow(
        "No tienes permisos para esta operación",
      );
    },
  );

  it("allows administrators through the deletion role guard", () => {
    const guard = new RolesGuard(new Reflector());
    expect(guard.canActivate(contextFor(["ADMINISTRADOR"]))).toBe(true);
  });

  it("deletes by public review code using the authenticated administrator", async () => {
    const remove = vi.fn().mockResolvedValue({ reviewCode, deleted: true });
    const controller = new AdminOpinionsController({ remove } as never);

    await expect(
      controller.remove(reviewCode, { id: 9 } as never),
    ).resolves.toEqual({ data: { reviewCode, deleted: true } });
    expect(remove).toHaveBeenCalledWith(reviewCode, 9);
  });
});
