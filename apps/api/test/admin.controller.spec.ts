import { describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AdminController } from "../src/admin/admin.controller";
import { ADMIN_CENTER_SECTION_CODES } from "../src/admin/admin.dto";
import { RolesGuard } from "../src/auth/roles.guard";

describe("AdminController section contract", () => {
  it("keeps audit section codes within the deployed column limit", () => {
    expect(
      Math.max(...ADMIN_CENTER_SECTION_CODES.map((code) => code.length)),
    ).toBeLessThanOrEqual(20);
  });

  it("rejects section keys outside the 14-section allowlist", async () => {
    const service = { saveSection: vi.fn() };
    const controller = new AdminController(service as never);

    await expect(
      controller.saveSection(
        "020101MC010202001",
        "seccion-inventada",
        { content: {} },
        { id: 7 } as never,
      ),
    ).rejects.toThrow("sección de ficha no está disponible");
    expect(service.saveSection).not.toHaveBeenCalled();
  });

  it("delegates an approved section key with the authenticated actor", async () => {
    const saveSection = vi.fn().mockResolvedValue({ code: "EC-001" });
    const controller = new AdminController({ saveSection } as never);

    await expect(
      controller.saveSection(
        "EC-001",
        "accesibilidad",
        { content: { localidadCercana: { localidadId: 3 } }, version: 4 },
        { id: 9 } as never,
      ),
    ).resolves.toEqual({ data: { code: "EC-001" } });
    expect(saveSection).toHaveBeenCalledWith("EC-001", "accesibilidad", 9, {
      content: { localidadCercana: { localidadId: 3 } },
      version: 4,
    });
  });
});

describe("AdminController deletion boundaries", () => {
  it("delegates logical deletion with the authenticated actor", async () => {
    const deleteCenter = vi
      .fn()
      .mockResolvedValue({ code: "EC-001", deleted: true });
    const deleteCatalog = vi
      .fn()
      .mockResolvedValue({ catalog: "FACILITY", id: 3, deleted: true });
    const controller = new AdminController({
      deleteCenter,
      deleteCatalog,
    } as never);
    const user = { id: 7, roles: ["ADMINISTRADOR"] } as never;

    await expect(controller.deleteCenter("EC-001", user)).resolves.toEqual({
      data: { code: "EC-001", deleted: true },
    });
    await expect(
      controller.deleteCatalog("FACILITY", "3", user),
    ).resolves.toEqual({
      data: { catalog: "FACILITY", id: 3, deleted: true },
    });
    expect(deleteCenter).toHaveBeenCalledWith("EC-001", 7);
    expect(deleteCatalog).toHaveBeenCalledWith(7, "FACILITY", 3);
  });

  it.each(["0", "-1", "1.2", "invalid"])(
    "rejects invalid catalog identifiers: %s",
    async (id) => {
      const deleteCatalog = vi.fn();
      const controller = new AdminController({ deleteCatalog } as never);

      await expect(
        controller.deleteCatalog("FACILITY", id, { id: 7 } as never),
      ).rejects.toThrow("identificador del catálogo no es válido");
      expect(deleteCatalog).not.toHaveBeenCalled();
    },
  );

  it.each(["deleteCenter", "deleteCatalog"] as const)(
    "limits %s to administrators through the role guard",
    (method) => {
      const guard = new RolesGuard(new Reflector());
      const context = (roles: string[]) =>
        ({
          getHandler: () => AdminController.prototype[method],
          getClass: () => AdminController,
          switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
        }) as unknown as ExecutionContext;

      for (const roles of [[], ["AGENTE_TURISTICO"], ["TURISTA"]]) {
        expect(() => guard.canActivate(context(roles))).toThrow(
          "No tienes permisos para esta operación.",
        );
      }
      expect(guard.canActivate(context(["ADMINISTRADOR"]))).toBe(true);
    },
  );
});
