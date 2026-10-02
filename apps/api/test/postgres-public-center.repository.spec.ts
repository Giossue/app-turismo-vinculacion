import { describe, expect, it, vi } from "vitest";

import { PostgresPublicCenterRepository } from "../src/centers/infrastructure/postgres-public-center.repository";

const row = {
  code: "020101MC010500001",
  name: "Centro Cultural Indio Guaranga",
  description: "Ficha pública",
  latitude: "-1.592630",
  longitude: "-79.000980",
  category: "Manifestaciones culturales",
  type: "Espacios culturales",
  subtype: "Centro cultural",
  hierarchy: "II",
  category_code: "MC",
  type_code: "02",
  subtype_code: "01",
  province_code: "02",
  canton_code: "01",
  parish_code: "01",
  hierarchy_code: "02",
  distance_meters: "14.25",
};

describe("PostgresPublicCenterRepository", () => {
  it("pages the published viewport with a stable order and its full count", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ total: "142" }]);
    const repository = new PostgresPublicCenterRepository({ query } as never);

    await expect(
      repository.listPublished({
        text: "Mirador",
        bounds: { west: -79.1, south: -1.7, east: -78.9, north: -1.5 },
        categoryCode: "AN",
        provinceCode: "02",
        limit: 100,
        offset: 100,
      }),
    ).resolves.toEqual({
      items: [expect.objectContaining({ code: row.code })],
      total: 142,
    });

    const [pageSql, pageValues] = query.mock.calls[0] as [string, unknown[]];
    const [countSql, countValues] = query.mock.calls[1] as [string, unknown[]];
    expect(pageValues).toEqual([
      "Mirador",
      -79.1,
      -1.7,
      -78.9,
      -1.5,
      "AN",
      null,
      null,
      "02",
      null,
      null,
      null,
      null,
      100,
      100,
    ]);
    expect(countValues).toEqual(pageValues.slice(0, 13));
    expect(pageSql).toContain(
      "DESC, c.nombre ASC, c.codigo_atractivo ASC LIMIT $14 OFFSET $15",
    );
    for (const sql of [pageSql, countSql]) {
      expect(sql).toContain("WHERE c.activo AND er.codigo = 'PUBLICADO'");
      expect(sql).toContain("ST_Intersects(c.ubicacion");
      expect(sql).toContain("ca.codigo = $6");
      expect(sql).toContain("p.codigo_dpa = $9");
    }
    expect(countSql).not.toContain("LIMIT");
    expect(countSql).not.toContain("OFFSET");
  });

  it("preserves the first page for callers that omit offset", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: "0" }]);
    const repository = new PostgresPublicCenterRepository({ query } as never);

    await repository.listPublished({ limit: 25 });

    expect(query.mock.calls[0]?.[1]).toEqual([
      ...Array<null>(13).fill(null),
      25,
      0,
    ]);
  });

  it("returns published centers ordered by PostGIS distance", async () => {
    const query = vi.fn().mockResolvedValue([row]);
    const repository = new PostgresPublicCenterRepository({ query } as never);

    await expect(
      repository.listNearbyPublished({
        latitude: -1.592,
        longitude: -79.001,
        radiusMeters: 5_000,
        limit: 6,
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          code: "020101MC010500001",
          distanceMeters: 14.25,
          latitude: -1.59263,
          longitude: -79.00098,
        }),
      ],
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("ST_DWithin(c.ubicacion"),
      [-1.592, -79.001, 5_000, null, 6],
    );
    expect(query.mock.calls[0]?.[0]).toContain("c.activo = TRUE");
    expect(query.mock.calls[0]?.[0]).toContain("er.codigo = 'PUBLICADO'");
    expect(query.mock.calls[0]?.[0]).toContain("ORDER BY distance_meters");
  });

  it("applies the optional public category filter without exposing the internal id", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new PostgresPublicCenterRepository({ query } as never);

    await repository.listNearbyPublished({
      latitude: -1.592,
      longitude: -79.001,
      radiusMeters: 1_000,
      category: "naturaleza",
      limit: 3,
    });

    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("$4::text IS NULL");
    expect(sql).not.toContain("c.id AS");
    expect(query.mock.calls[0]?.[1]).toEqual([
      -1.592,
      -79.001,
      1_000,
      "naturaleza",
      3,
    ]);
  });
});
