import { describe, expect, it, vi } from "vitest";

import { FavoritesService } from "../src/favorites/favorites.service";

const row = {
  code: "020201AN010103001",
  name: "Mirador turístico de Guaranda",
  description: null,
  latitude: "-1.59263",
  longitude: "-79.00098",
  category: "Atractivos naturales",
  type: "Sitios naturales",
  subtype: "Miradores",
  hierarchy: "III",
  category_code: "AN",
  type_code: "01",
  subtype_code: "01",
  province_code: "02",
  canton_code: "02",
  parish_code: "01",
  hierarchy_code: "03",
};

describe("FavoritesService", () => {
  it("lists only the published centers belonging to the current user", async () => {
    const query = vi.fn().mockResolvedValue([row]);
    const service = new FavoritesService({ query } as never);

    await expect(service.listCenters(17)).resolves.toEqual([
      {
        code: row.code,
        name: row.name,
        description: null,
        latitude: -1.59263,
        longitude: -79.00098,
        category: row.category,
        type: row.type,
        subtype: row.subtype,
        hierarchy: row.hierarchy,
        categoryCode: row.category_code,
        typeCode: row.type_code,
        subtypeCode: row.subtype_code,
        provinceCode: row.province_code,
        cantonCode: row.canton_code,
        parishCode: row.parish_code,
        hierarchyCode: row.hierarchy_code,
      },
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("f.usuario_id = $1"),
      [17],
    );
  });

  it("rejects an empty or oversized center code before querying", async () => {
    const query = vi.fn();
    const service = new FavoritesService({ query } as never);

    await expect(service.addCenter(17, " ")).rejects.toThrow("código");
    await expect(service.removeCenter(17, "x".repeat(101))).rejects.toThrow(
      "código",
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("is idempotent when saving the same published center twice", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "41" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row]);
    const service = new FavoritesService({ query } as never);

    await expect(service.addCenter(17, row.code)).resolves.toMatchObject({
      code: row.code,
    });
    expect(query.mock.calls[1]?.[0]).toContain("ON CONFLICT");
    expect(query.mock.calls[1]?.[1]).toEqual([17, "41"]);
  });
});
