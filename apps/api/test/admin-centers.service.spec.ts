import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

describe("AdminCentersService", () => {
  it("returns inventory summary counts grouped by review state", async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        { code: "PUBLICADO", name: "Publicado", total: 4, active: 3 },
        { code: "EN_REVISION", name: "En revisión", total: 2, active: 2 },
      ]),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(service.summary()).resolves.toEqual({
      total: 6,
      active: 5,
      pendingReview: 2,
      published: 4,
      inactive: 1,
      byStatus: [
        { code: "PUBLICADO", name: "Publicado", total: 4, active: 3 },
        { code: "EN_REVISION", name: "En revisión", total: 2, active: 2 },
      ],
    });
  });

  it("includes activity state in the paginated center list", async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          code: "EC-001",
          name: "Centro de prueba",
          statusCode: "PUBLICADO",
          statusName: "Publicado",
          updatedAt: "2026-09-18T00:00:00.000Z",
          submittedAt: null,
          requestedBy: null,
          observation: null,
          active: false,
          total: "1",
        },
      ]),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(
      service.list({ limit: 20, offset: 0 } as never),
    ).resolves.toMatchObject({
      total: 1,
      items: [{ code: "EC-001", active: false }],
    });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("c.activo AS active"),
      [20, 0],
    );
  });

  it("updates a technical catalog option and records the change", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "2", code: "MIRADOR", name: "Mirador", active: true },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "2", code: "MIRADOR", name: "Mirador panorámico", active: false },
      ])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    } as never);

    await expect(
      service.updateCatalog(7, "FACILITY", 2, {
        name: "Mirador panorámico",
        active: false,
      }),
    ).resolves.toEqual({
      catalog: "FACILITY",
      id: 2,
      code: "MIRADOR",
      name: "Mirador panorámico",
      active: false,
    });
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      expect.arrayContaining([7, "FACILITY", 2, "DESACTIVAR"]),
    );
  });
});
