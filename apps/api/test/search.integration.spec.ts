import "reflect-metadata";

import { writeFile } from "node:fs/promises";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { normalizeSearchText } from "../src/search/search-ranking";
import {
  SearchService,
  normalizedSearchSql,
} from "../src/search/search.service";

// Only the verification runner can supply a socket matching this private path.
const socket = process.env.PUBLIC_SEARCH_TEST_PGHOST;
const isolated = /^\/tmp\/turismo-public-search-check-[a-z0-9-]+$/i.test(
  socket ?? "",
);

describe.skipIf(!isolated)("public search with PostgreSQL/PostGIS", () => {
  let source: DataSource;
  let service: SearchService;
  const photon = vi.fn().mockResolvedValue([]);
  let sequence = 1;

  async function center(
    name: string,
    latitude = -1.6,
    state = "PUBLICADO",
    active = true,
    subtypeName?: string,
  ) {
    sequence += 1;
    const rows = await source.query<Array<{ id: string; code: string }>>(
      `INSERT INTO centros_turisticos
       (secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id,
        parroquia_id, linea_producto_id, escenario_id, jerarquia_id, estado_resenia_id,
        latitud, longitud, ubicacion, activo, descripcion)
       SELECT $1, $2,
         COALESCE((SELECT id FROM subtipos_atractivo WHERE nombre = $6 LIMIT 1), c.subtipo_atractivo_id),
         c.zona_turistica_id, c.parroquia_id, c.linea_producto_id, c.escenario_id, c.jerarquia_id,
         (SELECT id FROM estados_resenia WHERE codigo = $4),
         $3::double precision, -79, ST_SetSRID(ST_MakePoint(-79, $3::double precision), 4326)::geography, $5, 'Ficha pública de prueba'
       FROM centros_turisticos c WHERE c.nombre = 'Mirador turístico de Guaranda'
       RETURNING id, codigo_atractivo AS code`,
      [sequence, name, latitude, state, active, subtypeName ?? null],
    );
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  async function establishment(
    name: string,
    activity: string,
    classification: string,
    latitude = -1.6,
    state = "PUBLICADO",
    active = true,
  ) {
    const rows = await source.query<Array<{ id: string }>>(
      `INSERT INTO establecimientos_turisticos
       (localidad_id, nombre_comercial, actividad, clasificacion, latitud, longitud, ubicacion, estado_revision, activo, telefono, razon_social)
       SELECT id, $1, $2, $3, $4::double precision, -79, ST_SetSRID(ST_MakePoint(-79, $4::double precision), 4326)::geography, $5, $6, 'private-phone', 'private-company'
       FROM localidades WHERE nombre = 'Guaranda' RETURNING id`,
      [name, activity, classification, latitude, state, active],
    );
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  beforeAll(async () => {
    source = new DataSource({
      type: "postgres",
      host: socket!,
      port: 55493,
      username: "public_search_test",
      database: "turismo_vinculacion_app",
      password: "",
      synchronize: false,
      migrationsRun: false,
      logging: false,
    });
    await source.initialize();
    expect(
      await source.query(
        "SELECT current_database() AS database, current_user AS username, inet_server_addr() AS address",
      ),
    ).toEqual([
      {
        database: "turismo_vinculacion_app",
        username: "public_search_test",
        address: null,
      },
    ]);
    service = new SearchService(source, { search: photon } as never);
    await source.query(`INSERT INTO tipos_atractivo (categoria_id, codigo, nombre)
      SELECT id, '98', 'Taxonomía de prueba' FROM categorias_atractivo WHERE codigo = 'AN'`);
    await source.query(`INSERT INTO subtipos_atractivo (tipo_atractivo_id, codigo, nombre)
      SELECT id, '98', 'Cascadas' FROM tipos_atractivo WHERE codigo = '98'
      UNION ALL SELECT id, '99', 'Museos' FROM tipos_atractivo WHERE codigo = '98'`);
    await center("Café Mirador", -1.6);
    await center("Salto Azul", -1.6, "PUBLICADO", true, "Cascadas");
    await center("Casa de Historia", -1.6, "PUBLICADO", true, "Museos");
    await establishment("Café", "ALIMENTOS Y BEBIDAS", "CAFETERÍA", -1.601);
    await establishment("La Plaza", "ALIMENTOS Y BEBIDAS", "CAFETERÍA", -1.602);
    await establishment("Refugio Andino", "ALOJAMIENTO", "HOSTAL", -1.6);
    await center("Reserva Privada", -1.6, "BORRADOR");
    await center("Reserva Cerrada", -1.6, "PUBLICADO", false);
    await establishment(
      "Reserva Catastro",
      "ALIMENTOS Y BEBIDAS",
      "CAFETERÍA",
      -1.6,
      "EN_REVISION",
    );
    await establishment(
      "Reserva Inactiva",
      "ALOJAMIENTO",
      "HOSTAL",
      -1.6,
      "PUBLICADO",
      false,
    );
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  it("searches published classifications on the existing schema", async () => {
    const result = await service.search({
      q: "cafeterias",
      kind: "establishment",
    });
    expect(result.items.map((item) => item.title)).toContain("La Plaza");
  });

  it.each([
    "Café",
    "CAFÉ",
    "cafe\u0301",
    "  Niño / Bolívar  ",
    "Museo—Guaranda",
    "%%",
  ])("keeps SQL and JS normalization equivalent for %s", async (value) => {
    const [{ normalized }] = await source.query<Array<{ normalized: string }>>(
      `SELECT ${normalizedSearchSql("$1::text")} AS normalized`,
      [value],
    );
    expect(normalized).toBe(normalizeSearchText(value));
  });

  it.each([
    ["café", "Café"],
    ["cafeterias", "La Plaza"],
    ["comer", "La Plaza"],
    ["hoteles", "Refugio Andino"],
    ["hostal", "Refugio Andino"],
    ["cascadas", "Salto Azul"],
    ["museos", "Casa de Historia"],
  ])("finds the published classification for %s", async (query, title) => {
    expect(
      (await service.search({ q: query })).items.map((item) => item.title),
    ).toContain(title);
  });

  it("tolerates a minor typo in an existing name", async () => {
    expect(
      (await service.search({ q: "Refujio Andino" })).items.map(
        (item) => item.title,
      ),
    ).toContain("Refugio Andino");
  });

  it("ranks relevance before distance, and compares distance across all kinds", async () => {
    photon.mockResolvedValueOnce([
      {
        title: "Café",
        subtitle: "Ecuador",
        latitude: -1.7,
        longitude: -79,
        type: "street",
      },
    ]);
    const result = await service.search({
      q: "cafe",
      latitude: -1.6,
      longitude: -79,
    });
    expect(result.items.slice(0, 3).map((item) => item.kind)).toEqual([
      "establishment",
      "geographic",
      "center",
    ]);
    expect(result.items[0].distanceMeters).toBeGreaterThan(100);
    expect(result.items[0].distanceMeters).toBeLessThan(120);
  });

  it("returns description relevance above a fuzzy title without losing the score", async () => {
    const fixture = await center("Ruta educativa");
    await source.query(
      "UPDATE centros_turisticos SET descripcion = 'Visita el refujio andino de la zona' WHERE id = $1",
      [fixture.id],
    );
    const result = await service.search({ q: "Refujio Andino" });
    expect(result.items.slice(0, 2).map((item) => item.title)).toEqual([
      "Ruta educativa",
      "Refugio Andino",
    ]);
    expect(result.items[0].relevance).toBe(200);
    expect(result.items[1].relevance).toBeGreaterThanOrEqual(100);
    expect(result.items[1].relevance).toBeLessThan(150);
  });

  it("excludes unpublished, inactive and logically deleted records", async () => {
    const deleted = await establishment(
      "Reserva Eliminada",
      "ALOJAMIENTO",
      "HOSTAL",
    );
    await source.query(
      "UPDATE establecimientos_turisticos SET activo = FALSE, eliminado_at = now() WHERE id = $1",
      [deleted.id],
    );
    const incomplete = await center("Reserva Sin Código");
    await source.query(
      "UPDATE centros_turisticos SET jerarquia_id = NULL WHERE id = $1",
      [incomplete.id],
    );
    expect((await service.search({ q: "Reserva" })).items).toEqual([]);
  });

  it("filters internal matches and Photon candidates with inclusive viewport bounds", async () => {
    await center("Panorama Fuera", -2);
    await center("Panorama Dentro", -1.6);
    await establishment("Panorama Catastro Fuera", "ALOJAMIENTO", "HOSTAL", -2);
    photon.mockResolvedValueOnce([
      {
        title: "Panorama calle fuera",
        subtitle: "Ecuador",
        latitude: -2,
        longitude: -79,
        type: "street",
      },
      {
        title: "Panorama calle dentro",
        subtitle: "Ecuador",
        latitude: -1.6,
        longitude: -79,
        type: "street",
      },
    ]);
    const result = await service.search({
      q: "Panorama",
      west: -79,
      south: -1.61,
      east: -78.9,
      north: -1.59,
    });
    expect(result.items.map((item) => item.title).sort()).toEqual([
      "Panorama Dentro",
      "Panorama calle dentro",
    ]);
  });

  it("exposes bounded relevance and no IDs or raw establishment data", async () => {
    const result = await service.search({ q: "cafe" });
    for (const item of result.items) {
      expect(item).not.toHaveProperty("id");
      expect(item).not.toHaveProperty("telefono");
      expect(item).not.toHaveProperty("razon_social");
      expect(item.relevance).toBeGreaterThanOrEqual(100);
      expect(item.relevance).toBeLessThanOrEqual(600);
    }
    expect(
      result.items.find((item) => item.kind === "center")?.centerCode,
    ).toMatch(/^.{17}$/);
  });

  it("captures a real search plan against representative catalog volume", async () => {
    await source.query(`INSERT INTO establecimientos_turisticos
      (localidad_id, nombre_comercial, actividad, latitud, longitud, ubicacion)
      SELECT l.id, 'Negocio de prueba ' || sequence, 'OTRA ACTIVIDAD', -1.6, -79,
        ST_SetSRID(ST_MakePoint(-79, -1.6), 4326)::geography
      FROM localidades l CROSS JOIN generate_series(1, 3000) sequence
      WHERE l.nombre = 'Guaranda'`);
    await source.query("ANALYZE establecimientos_turisticos");
    const capture = vi.spyOn(source, "query");
    await service.search({ q: "cafe", kind: "establishment" });
    const [sql, parameters] = capture.mock.calls[0];
    capture.mockRestore();
    const plan = await source.query<
      Array<{ "QUERY PLAN": Array<{ "Execution Time": number }> }>
    >(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, parameters);
    const executionTime = plan[0]["QUERY PLAN"][0]["Execution Time"];
    expect(Number.isFinite(executionTime)).toBe(true);
    await writeFile(
      "/tmp/turismo-public-search-explain.json",
      JSON.stringify(
        { additionalEstablishments: 3000, ...plan[0]["QUERY PLAN"][0] },
        null,
        2,
      ),
    );
  });
});
