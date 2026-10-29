import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

function createService(
  query: ReturnType<typeof vi.fn>,
  media?: { removeObjects: ReturnType<typeof vi.fn> },
) {
  const manager = { query };
  const transaction = vi.fn(
    async (callback: (value: typeof manager) => unknown) => callback(manager),
  );
  return {
    service: new AdminCentersService({ transaction } as never, media as never),
    transaction,
  };
}

describe("administrative logical deletion", () => {
  it("deletes a center in one transaction and removes its stored files afterwards", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "10", code: "EC-001" }])
      .mockResolvedValueOnce([
        { key: "centers/10/a.webp" },
        { key: "centers/10/b.webp" },
      ])
      .mockResolvedValueOnce([]);
    const removeObjects = vi.fn().mockResolvedValue(undefined);
    const { service, transaction } = createService(query, { removeObjects });

    await expect(service.deleteCenter("EC-001")).resolves.toEqual({
      code: "EC-001",
      deleted: true,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[2][0]).toMatch(
      /^\s*DELETE FROM centros_turisticos/,
    );
    expect(query.mock.calls[2][1]).toEqual(["10"]);
    expect(
      query.mock.calls.some(([sql]) => /UPDATE\s+centros_turisticos/.test(sql)),
    ).toBe(false);
    expect(removeObjects).toHaveBeenCalledWith([
      "centers/10/a.webp",
      "centers/10/b.webp",
    ]);
  });

  it("does not remove files when the center deletion fails", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "10", code: "EC-001" }])
      .mockResolvedValueOnce([{ key: "centers/10/a.webp" }])
      .mockRejectedValueOnce(new Error("delete failed"));
    const removeObjects = vi.fn();
    const { service } = createService(query, { removeObjects });

    await expect(service.deleteCenter("EC-001")).rejects.toThrow(
      "delete failed",
    );
    expect(removeObjects).not.toHaveBeenCalled();
  });

  describe("agent ownership", () => {
    const own = {
      id: "10",
      code: "EC-001",
      responsibleId: "7",
      statusCode: "BORRADOR",
      publishedAt: null,
    };

    it("lets an agent delete a center they own", async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([own])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const { service } = createService(query);

      await expect(service.deleteCenter("EC-001", 7, false)).resolves.toEqual({
        code: "EC-001",
        deleted: true,
      });
      expect(query.mock.calls[2][0]).toMatch(
        /^\s*DELETE FROM centros_turisticos/,
      );
    });

    it("lets an agent delete their published center", async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ ...own, statusCode: "PUBLICADO" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const { service } = createService(query);

      await expect(
        service.deleteCenter("EC-001", 7, false),
      ).resolves.toMatchObject({ deleted: true });
    });

    it("hides another agent's center as not found and deletes nothing", async () => {
      const query = vi.fn().mockResolvedValueOnce([own]);
      const { service } = createService(query);

      await expect(service.deleteCenter("EC-001", 99, false)).rejects.toThrow(
        "No se encontró la ficha turística.",
      );
      expect(query).toHaveBeenCalledTimes(1);
    });

    it("refuses to delete a center while it is under review", async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ ...own, statusCode: "EN_REVISION" }]);
      const { service } = createService(query);

      await expect(service.deleteCenter("EC-001", 7, false)).rejects.toThrow(
        "mientras está en revisión",
      );
      expect(query).toHaveBeenCalledTimes(1);
    });

    it("keeps the administrator free to delete any center in any state", async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([
          { ...own, responsibleId: "55", statusCode: "EN_REVISION" },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const { service } = createService(query);

      await expect(
        service.deleteCenter("EC-001", 1, true),
      ).resolves.toMatchObject({ deleted: true });
    });
  });

  it("returns not found for an unknown center", async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const { service } = createService(query);
    await expect(service.deleteCenter("EC-404")).rejects.toThrow(
      "No se encontró la ficha turística.",
    );
  });

  it.each([
    "ACCESSIBILITY",
    "ACTIVITY",
    "FACILITY",
    "ESTABLISHMENT_CLASSIFICATION",
    "ESTABLISHMENT_CATEGORY",
  ])(
    "retains referenced %s catalog options and their audit",
    async (catalog) => {
      const previous = {
        id: 3,
        nombre: "Opción",
        activo: true,
        eliminado_at: null,
      };
      const next = {
        ...previous,
        activo: false,
        eliminado_at: "2026-10-02T12:00:00Z",
      };
      const query = vi.fn().mockResolvedValueOnce([{ snapshot: previous }]);
      if (catalog === "ESTABLISHMENT_CLASSIFICATION")
        query.mockResolvedValueOnce([]);
      query
        .mockResolvedValueOnce([{ snapshot: next }])
        .mockResolvedValueOnce([]);
      const { service } = createService(query);

      await expect(service.deleteCatalog(7, catalog, 3)).resolves.toEqual({
        catalog,
        id: 3,
        deleted: true,
      });
      expect(query).toHaveBeenLastCalledWith(
        expect.stringContaining("'ELIMINAR'"),
        [7, catalog, 3, JSON.stringify(previous), JSON.stringify(next)],
      );
      expect(query.mock.calls.some(([sql]) => /^\s*DELETE\b/.test(sql))).toBe(
        false,
      );
    },
  );

  it("refuses deleting a classification until all categories have been removed", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ snapshot: { id: 3 } }])
      .mockResolvedValueOnce([{ exists: 1 }]);
    const { service } = createService(query);

    await expect(
      service.deleteCatalog(7, "ESTABLISHMENT_CLASSIFICATION", 3),
    ).rejects.toThrow("Elimina primero las categorías");
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain("eliminado_at IS NULL");
  });

  it("keeps non-managed catalogs outside the deletion allowlist", async () => {
    const query = vi.fn();
    const { service, transaction } = createService(query);

    await expect(service.deleteCatalog(7, "PROVINCE", 3)).rejects.toThrow(
      "El catálogo no está disponible.",
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each(["catalog"])(
    "accepts repeated %s deletion without a second audit",
    async () => {
      const query = vi.fn().mockResolvedValue([
        {
          id: "10",
          code: "EC-001",
          snapshot: {
            id: 10,
            activo: false,
            eliminado_at: "2026-10-02T12:00:00Z",
          },
        },
      ]);
      const { service } = createService(query);

      await expect(
        service.deleteCatalog(7, "FACILITY", 10),
      ).resolves.toMatchObject({ deleted: true });
      expect(query).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["catalog"])(
    "propagates an audit failure from the %s deletion transaction",
    async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([
          { id: "10", code: "EC-001", snapshot: { id: 10, activo: true } },
        ])
        .mockResolvedValueOnce([{ snapshot: { id: 10, activo: false } }])
        .mockRejectedValueOnce(new Error("audit failed"));
      const { service, transaction } = createService(query);

      await expect(service.deleteCatalog(7, "FACILITY", 10)).rejects.toThrow(
        "audit failed",
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      await expect(transaction.mock.results[0].value).rejects.toThrow(
        "audit failed",
      );
    },
  );

  it.each([
    "find",
    "sections",
    "valuation",
    "save",
    "saveSection",
    "submitReview",
    "review",
    "publish",
    "deactivate",
    "reactivate",
  ])("does not allow %s after a center has been deleted", async (operation) => {
    const query = vi.fn().mockResolvedValue([]);
    const { service } = createService(query);
    const operations: Record<string, () => Promise<unknown>> = {
      find: () => service.find("EC-001"),
      sections: () => service.sections("EC-001"),
      valuation: () => service.valuation("EC-001"),
      save: () => service.save("EC-001", 7, { name: "Cambio" }),
      saveSection: () =>
        service.saveSection("EC-001", "accesibilidad", 7, { content: {} }),
      submitReview: () => service.submitReview("EC-001", 7),
      review: () => service.review("EC-001", 7, { action: "APPROVE" }),
      publish: () => service.publish("EC-001", 7),
      deactivate: () => service.deactivate("EC-001", 7),
      reactivate: () => service.reactivate("EC-001", 7),
    };

    await expect(operations[operation]()).rejects.toThrow(
      "No se encontró la ficha turística.",
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("c.eliminado_at IS NULL");
  });

  it("does not reactivate a deleted catalog option", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const { service } = createService(query);

    await expect(
      service.updateCatalog(7, "FACILITY", 3, { active: true }),
    ).rejects.toThrow("No se encontró la opción del catálogo.");
    expect(query.mock.calls[0][0]).toContain("eliminado_at IS NULL");
  });

  it("omits deleted centers from both the inventory and summary", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AdminCentersService({ query } as never);

    await service.list({ limit: 25, offset: 0 });
    await service.summary();
    expect(
      query.mock.calls.every(([sql]) =>
        sql.includes("WHERE c.eliminado_at IS NULL"),
      ),
    ).toBe(true);
  });

  it("omits deleted catalog options even when inactive options are requested", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AdminCentersService({ query } as never);

    await service.catalogs({ includeInactive: true });
    for (const table of [
      "tipos_accesibilidad",
      "actividades_turisticas",
      "tipos_facilidad",
      "catalogo_catastro_clasificaciones",
      "catalogo_catastro_categorias",
    ]) {
      const statement = query.mock.calls.find(([sql]) =>
        sql.includes(`FROM ${table}`),
      )?.[0];
      expect(statement).toContain("eliminado_at IS NULL");
    }
  });

  it("preserves access to a deleted center's audit history", async () => {
    const query = vi.fn().mockResolvedValue([{ action: "ELIMINAR" }]);
    const service = new AdminCentersService({ query } as never);

    await expect(service.getAudit("EC-001")).resolves.toEqual({
      items: [{ action: "ELIMINAR" }],
    });
    expect(query.mock.calls[0][0]).not.toContain("eliminado_at IS NULL");
  });
});
