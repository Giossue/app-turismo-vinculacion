import { describe, expect, it, vi } from "vitest";

import { AdminController } from "../src/admin/admin.controller";
import { ADMIN_CENTER_SECTION_CODES } from "../src/admin/admin.dto";

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
