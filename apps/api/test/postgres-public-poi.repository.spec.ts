import { describe, expect, it, vi } from "vitest";

import { PostgresPublicPoiRepository } from "../src/pois/infrastructure/postgres-public-poi.repository";

describe("PostgresPublicPoiRepository", () => {
  it("maps active POIs by distance without returning their database id", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        name: "Plaza cultural de Guaranda",
        description: "Punto publicado",
        zoneName: "Entorno de Guaranda",
        localityName: "Guaranda",
        latitude: "-1.5934",
        longitude: "-79.0008",
        distanceMeters: "180.5",
      },
    ]);
    const repository = new PostgresPublicPoiRepository({ query } as never);

    const result = await repository.listNearby({
      latitude: -1.592,
      longitude: -79.001,
      radiusMeters: 5_000,
      limit: 6,
    });

    expect(result.items[0]).toEqual({
      name: "Plaza cultural de Guaranda",
      description: "Punto publicado",
      zoneName: "Entorno de Guaranda",
      localityName: "Guaranda",
      latitude: -1.5934,
      longitude: -79.0008,
      distanceMeters: 180.5,
    });
    expect(result.items[0]).not.toHaveProperty("id");
    expect(query.mock.calls[0]?.[0]).toContain("ST_DWithin");
    expect(query.mock.calls[0]?.[0]).toContain("pi.activo = TRUE");
    expect(query.mock.calls[0]?.[0]).toContain("z.activo = TRUE");
  });
});
