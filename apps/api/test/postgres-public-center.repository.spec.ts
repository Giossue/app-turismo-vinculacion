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
