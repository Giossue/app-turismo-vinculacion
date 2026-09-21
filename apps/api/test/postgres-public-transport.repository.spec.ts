import { describe, expect, it, vi } from "vitest";

import { PostgresPublicTransportRepository } from "../src/transport/infrastructure/postgres-public-transport.repository";

describe("PostgresPublicTransportRepository", () => {
  it("returns an empty public transport catalog when a center has no records", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "7", name: "Centro publicado" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const repository = new PostgresPublicTransportRepository({ query } as never);

    await expect(
      repository.findForPublishedCenter("CENTER-001"),
    ).resolves.toEqual({
      centerName: "Centro publicado",
      transportTypes: [],
      details: [],
      routes: [],
    });
    expect(query.mock.calls[0]?.[0]).toContain("er.codigo = 'PUBLICADO'");
    expect(query.mock.calls[1]?.[0]).toContain("rutas_transporte");
    expect(query.mock.calls[1]?.[0]).toContain("rt.activo = TRUE");
  });

  it("uses an indexed spatial predicate for nearby active stops", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new PostgresPublicTransportRepository({ query } as never);

    await expect(
      repository.listNearbyStops({
        latitude: -1.592,
        longitude: -79.001,
        radiusMeters: 2_000,
        limit: 6,
      }),
    ).resolves.toEqual([]);
    expect(query.mock.calls[0]?.[0]).toContain("ST_DWithin");
    expect(query.mock.calls[0]?.[0]).toContain("p.activo = TRUE");
    expect(query.mock.calls[0]?.[1]).toEqual([-1.592, -79.001, 2_000, 6]);
  });
});
