import { describe, expect, it, vi } from "vitest";

import { OfflineCityAreaUnavailableError } from "../domain/offline-city";
import { PostgresOfflineCityRepository } from "./postgres-offline-city.repository";

const cityRow = {
  id: "1",
  name: "Guaranda",
  canton: "Guaranda",
  province: "Bolívar",
  latitude: "-1.6",
  longitude: "-79",
  package_version: 3,
  package_checksum: null,
  package_zoom_min: 8,
  package_zoom_max: 17,
  package_published_at: new Date("2026-10-02T12:00:00Z"),
};

const boundary = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [-79.02, -1.61],
        [-78.97, -1.56],
        [-79.02, -1.61],
      ],
    ],
  ],
};

type CityRow = Omit<typeof cityRow, "latitude" | "longitude"> & {
  latitude: string | null;
  longitude: string | null;
};

const routeRow = {
  id: "11",
  name: "Ruta norte",
  origin: "Centro",
  destination: "Terminal",
  duration_minutes: "20",
  distance_meters: "1200.5",
  transport_code: "BUS",
  geometry: {
    type: "LineString",
    coordinates: [
      [-79, -1.6],
      [-78.99, -1.59],
    ],
  },
  directions: [{ instruction: "Continúa hacia el terminal" }],
};

const establishment = {
  id: 4,
  name: "Restaurante público",
  activity: "ALIMENTOS Y BEBIDAS",
  classification: "RESTAURANTE",
  category: "2 tenedores",
  categoryLabel: "RESTAURANTE · 2 tenedores",
  address: "Plaza central",
  phone: null,
  localityName: "Guaranda",
  latitude: -1.59,
  longitude: -79,
  approximate: true,
  icon: "eat-drink-restaurant",
  group: "restaurants",
};

function makeRepository({
  city = cityRow as CityRow,
  cityBoundary = boundary as Record<string, unknown> | null,
  establishments = [establishment],
  routes = [routeRow],
} = {}) {
  const query = vi
    .fn()
    .mockResolvedValueOnce([city])
    .mockResolvedValueOnce([{ boundary: cityBoundary }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(routes)
    .mockResolvedValueOnce(establishments)
    .mockResolvedValueOnce([
      {
        id: "7",
        name: "Plaza pública",
        description: "Punto cultural",
        latitude: -1.59,
        longitude: -79,
      },
    ]);
  return {
    query,
    repository: new PostgresOfflineCityRepository({ query } as never),
  };
}

describe("offline city public snapshot", () => {
  it("exports public POIs and establishments with the exact geographic download coverage", async () => {
    const { query, repository } = makeRepository();
    const manifest = await repository.getManifest("bolivar-guaranda-guaranda");

    expect(manifest?.bounds).toEqual([-79.02, -1.61, -78.97, -1.56]);
    expect(manifest?.establishments).toEqual([establishment]);
    expect(manifest?.pois).toEqual([
      {
        key: expect.stringMatching(/^poi-[0-9a-f]{24}$/),
        name: "Plaza pública",
        description: "Punto cultural",
        category: null,
        latitude: -1.59,
        longitude: -79,
        icon: "tourism-information",
      },
    ]);
    expect(query.mock.calls[4]?.[1]?.slice(0, 5)).toEqual([
      boundary,
      ...manifest!.bounds,
    ]);
    expect(query.mock.calls[5]?.[1]).toEqual([
      cityRow.id,
      boundary,
      ...manifest!.bounds,
    ]);
    expect(query.mock.calls[4]?.[0]).toContain(
      "ST_Covers(area.geometry, e.ubicacion)",
    );
    expect(query.mock.calls[5]?.[0]).toContain(
      "ST_Covers(area.geometry, pi.ubicacion)",
    );
  });

  it("keeps review/private data outside the public snapshot and requires active/published sources", async () => {
    const { query, repository } = makeRepository({
      establishments: [
        { ...establishment, ruc: "PRIVATE" } as typeof establishment,
      ],
    });
    const manifest = await repository.getManifest("bolivar-guaranda-guaranda");

    // El id público permite abrir la ficha y guardar el favorito sin conexión.
    expect(manifest?.establishments[0]).toHaveProperty("id", 4);
    expect(manifest?.establishments[0]).not.toHaveProperty("ruc");
    const establishmentSql = query.mock.calls[4]?.[0] as string;
    expect(establishmentSql).toContain("e.activo = TRUE");
    expect(establishmentSql).toContain("e.estado_revision = 'PUBLICADO'");
    expect(establishmentSql).toContain("l.activo AND co.activo AND p.activo");
    expect(establishmentSql).not.toMatch(
      /\be\.(ruc|razon_social|responsable_usuario_id|observacion_revision)\b/,
    );
    const poiSql = query.mock.calls[5]?.[0] as string;
    expect(poiSql).toContain("pi.activo = TRUE AND z.activo = TRUE");
    expect(poiSql).toContain("l.activo AND co.activo AND p.activo");
    expect(poiSql).toContain("z.localidad_id = $1");
    expect(query.mock.calls[2]?.[0]).toContain("er.codigo = 'PUBLICADO'");
    expect(query.mock.calls[3]?.[0]).toContain("version.estado = 'PUBLICADA'");
  });

  it("does not truncate a city's establishments using map viewport limits", async () => {
    const establishments = Array.from({ length: 2_501 }, (_, index) => ({
      ...establishment,
      name: `Restaurante público ${index}`,
    }));
    const { query, repository } = makeRepository({ establishments });
    const manifest = await repository.getManifest("bolivar-guaranda-guaranda");
    expect(manifest?.establishments).toHaveLength(2_501);
    expect(query.mock.calls[4]?.[0]).not.toMatch(/\bLIMIT\b|\bOFFSET\b/i);
    expect(query.mock.calls[5]?.[0]).not.toMatch(/\bLIMIT\b|\bOFFSET\b/i);
  });

  it("uses the same fallback area in the manifest and spatial queries", async () => {
    const { query, repository } = makeRepository({ cityBoundary: null });
    const manifest = await repository.getManifest("bolivar-guaranda-guaranda");
    expect(manifest?.boundary).toBeNull();
    expect(manifest?.bounds[0]).toBeCloseTo(-79.12);
    expect(query.mock.calls[4]?.[1]?.slice(0, 5)).toEqual([
      null,
      ...manifest!.bounds,
    ]);
    expect(query.mock.calls[4]?.[0]).toContain(
      "ST_MakeEnvelope($2, $3, $4, $5, 4326)",
    );
  });

  it("refuses a city without coverage rather than downloading another city's maps", async () => {
    const { query, repository } = makeRepository({
      city: { ...cityRow, latitude: null, longitude: null },
      cityBoundary: null,
    });
    await expect(
      repository.getManifest("bolivar-guaranda-guaranda"),
    ).rejects.toThrow(OfflineCityAreaUnavailableError);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("keeps legacy route keys while disambiguating same-name routes without exposing internal ids", async () => {
    const { repository } = makeRepository({
      routes: [routeRow, { ...routeRow, id: "12" }],
    });
    const manifest = await repository.getManifest("bolivar-guaranda-guaranda");
    const routes = manifest!.routes;
    expect(routes[0]?.key).toBe("ruta-norte-centro-terminal");
    expect(routes[1]?.key).toBe(routes[0]?.key);
    expect(routes[1]?.publicKey).not.toBe(routes[0]?.publicKey);
    expect(routes[0]).toMatchObject({
      publicKey: expect.stringMatching(/^route-[0-9a-f]{24}$/),
      durationMinutes: 20,
      distanceMeters: 1_200.5,
      transportCode: "BUS",
    });
    expect(routes[0]).not.toHaveProperty("id");
  });

  it("makes a city downloadable from its published content, without a manual package", async () => {
    const query = vi.fn().mockResolvedValue([cityRow]);
    const repository = new PostgresOfflineCityRepository({ query } as never);
    await repository.listCities();
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain(
      "WHEN paquete.id IS NOT NULL OR centers.published OR pois.published",
    );
    expect(sql).toContain("e.estado_revision = 'PUBLICADO'");
    expect(sql).toContain("er.codigo = 'PUBLICADO'");
    // Any change, including unpublishing, raises the version.
    expect(sql).toContain("FLOOR(EXTRACT(EPOCH FROM content.changed_at))");
    expect(sql).toContain("MAX(e.updated_at)");
    expect(sql).toContain("MAX(z.updated_at)");
    expect(sql).toContain("MAX(version.updated_at)");
  });

  it("does not load cities without content or unknown city slugs", async () => {
    const query = vi
      .fn()
      .mockResolvedValue([{ ...cityRow, package_version: null }]);
    const repository = new PostgresOfflineCityRepository({ query } as never);
    await expect(
      repository.getManifest("bolivar-guaranda-guaranda"),
    ).resolves.toBeNull();
    await expect(repository.getManifest("other-city")).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(2);
  });
});
