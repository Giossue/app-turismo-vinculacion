import "reflect-metadata";

import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AdminNavigationService } from "../src/admin/admin-navigation.service";

// A dedicated disposable cluster is the only allowed target; never application env/.pgpass.
const socket = process.env.ADMIN_NAVIGATION_TEST_PGHOST;
const isolated = /^\/tmp\/turismo-admin-navigation-check-[a-z0-9-]+$/i.test(
  socket ?? "",
);
const at = (hour: number) =>
  `2026-10-04T${String(hour).padStart(2, "0")}:00:00.000Z`;

describe.skipIf(!isolated)("navigation aggregates with PostgreSQL", () => {
  let source: DataSource;
  let service: AdminNavigationService;

  beforeAll(async () => {
    source = new DataSource({
      type: "postgres",
      host: socket!,
      port: 55495,
      username: "admin_navigation_test",
      database: "admin_navigation_test",
      password: "",
      synchronize: false,
      migrationsRun: false,
      logging: false,
    });
    await source.initialize();
    const identity = await source.query<
      { username: string; database: string; address: null }[]
    >(
      "SELECT current_user AS username, current_database() AS database, inet_server_addr() AS address",
    );
    expect(identity[0]).toEqual({
      username: "admin_navigation_test",
      database: "admin_navigation_test",
      address: null,
    });
    await source.query("SET TIME ZONE 'UTC'");
    // Only the columns read by this endpoint are needed; the database is private and disposable.
    await source.query(`
      CREATE TABLE estados_resenia (id integer PRIMARY KEY, codigo text NOT NULL);
      INSERT INTO estados_resenia VALUES (1,'BORRADOR'),(2,'EN_REVISION'),(3,'APROBADO'),(4,'PUBLICADO'),(5,'RECHAZADO'),(6,'INACTIVO');
      CREATE TABLE centros_turisticos (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        responsable_usuario_id bigint, estado_resenia_id integer,
        publicado_at timestamptz, eliminado_at timestamptz, activo boolean DEFAULT true,
        created_at timestamptz DEFAULT '2026-10-04T01:00:00Z',
        updated_at timestamptz DEFAULT '2026-10-04T01:00:00Z'
      );
      CREATE TABLE borradores_centros_turisticos (
        centro_turistico_id bigint UNIQUE, estado_resenia_id integer, updated_at timestamptz
      );
      CREATE TABLE auditoria_fichas (
        centro_turistico_id bigint, usuario_id bigint, accion text, created_at timestamptz
      );
      CREATE TABLE revisiones_publicacion (
        centro_turistico_id bigint, fecha_solicitud timestamptz, fecha_revision timestamptz
      );
      CREATE TABLE establecimientos_turisticos (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        responsable_usuario_id bigint, estado_revision text, eliminado_at timestamptz,
        fecha_solicitud timestamptz, fecha_revision timestamptz, activo boolean DEFAULT false,
        created_at timestamptz DEFAULT '2026-10-04T01:00:00Z',
        updated_at timestamptz DEFAULT '2026-10-04T01:00:00Z'
      );
      CREATE TABLE auditoria_catalogos (
        registro_id bigint, usuario_id bigint, catalogo_codigo text, accion text, created_at timestamptz
      );
      CREATE TABLE opiniones (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        estado_moderacion text, eliminado_at timestamptz,
        created_at timestamptz DEFAULT '2026-10-04T01:00:00Z',
        updated_at timestamptz DEFAULT '2026-10-04T01:00:00Z'
      );
      CREATE TABLE opinion_versiones (
        opinion_id bigint, estado_moderacion text, created_at timestamptz, revisado_at timestamptz
      );
      CREATE TABLE moderaciones_opinion (opinion_id bigint, created_at timestamptz);
    `);
    service = new AdminNavigationService(source);
  });

  beforeEach(async () => {
    await source.query(`TRUNCATE centros_turisticos, borradores_centros_turisticos,
      auditoria_fichas, revisiones_publicacion, establecimientos_turisticos,
      auditoria_catalogos, opiniones, opinion_versiones, moderaciones_opinion RESTART IDENTITY`);
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  async function center(
    state: string,
    owner: number | null = 7,
    draftState?: string,
    options: { deleted?: boolean; published?: boolean; hour?: number } = {},
  ) {
    const rows = await source.query<{ id: string }[]>(
      `INSERT INTO centros_turisticos (responsable_usuario_id,estado_resenia_id,publicado_at,eliminado_at,updated_at)
       SELECT $1,id,$3::timestamptz,$4::timestamptz,$5::timestamptz FROM estados_resenia WHERE codigo=$2 RETURNING id`,
      [
        owner,
        state,
        options.published ? at(1) : null,
        options.deleted ? at(options.hour ?? 1) : null,
        at(options.hour ?? 1),
      ],
    );
    const id = rows[0].id;
    if (draftState)
      await source.query(
        `INSERT INTO borradores_centros_turisticos SELECT $1,id,$3::timestamptz FROM estados_resenia WHERE codigo=$2`,
        [id, draftState, at(options.hour ?? 1)],
      );
    return id;
  }

  async function establishment(
    state: string,
    owner: number | null = 7,
    options: { deleted?: boolean; hour?: number } = {},
  ) {
    const rows = await source.query<{ id: string }[]>(
      `INSERT INTO establecimientos_turisticos (responsable_usuario_id,estado_revision,eliminado_at,updated_at)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [
        owner,
        state,
        options.deleted ? at(options.hour ?? 1) : null,
        at(options.hour ?? 1),
      ],
    );
    return rows[0].id;
  }

  it("returns empty signals when no operational records or history exist", async () => {
    expect(await service.summary(7, true)).toEqual({
      review: { pending: 0, latestChange: null },
      opinions: { pending: 0, latestChange: null },
      centers: { pending: 0, latestChange: null },
      establishments: { pending: 0, latestChange: null },
      catalogs: { pending: 0, latestChange: null },
    });
  });

  it("uses proposed center states before the published base and normalizes legacy states", async () => {
    await center("PUBLICADO", 7, "EN_REVISION");
    await center("PUBLICADO", 7, "BORRADOR");
    await center("PUBLICADO", 7, "PUBLICADO");
    await center("BORRADOR");
    await center("EN_REVISION", 8);
    await center("BORRADOR", 8, undefined, { deleted: true });
    await center("BORRADOR", null);
    await center("INACTIVO", 7, undefined, { published: true });
    await center("APROBADO");
    await center("RECHAZADO");

    const admin = await service.summary(1, true);
    expect(admin.centers.pending).toBe(7);
    expect(admin.review.pending).toBe(3);
    const agent = await service.summary(7, false);
    expect(agent.centers.pending).toBe(5);
    expect(agent.review).toEqual({ pending: 0, latestChange: null });
  });

  it("counts all pending records rather than a page and leaves published records out", async () => {
    await source.query(`INSERT INTO centros_turisticos (responsable_usuario_id,estado_resenia_id)
      SELECT 7,1 FROM generate_series(1,31)`);
    await source.query(`INSERT INTO establecimientos_turisticos (responsable_usuario_id,estado_revision)
      SELECT 7,'BORRADOR' FROM generate_series(1,32)`);
    await center("PUBLICADO");
    await establishment("PUBLICADO");
    const result = await service.summary(7, true);
    expect(result.centers.pending).toBe(31);
    expect(result.establishments.pending).toBe(32);
    expect(result.review.pending).toBe(0);
  });

  it("combines only review queues and keeps draft, rejected, and inactive captures pending", async () => {
    const c = await center("PUBLICADO", 7, "EN_REVISION");
    await establishment("BORRADOR");
    await establishment("RECHAZADO");
    const e = await establishment("EN_REVISION");
    await establishment("PUBLICADO");
    await establishment("EN_REVISION", 7, { deleted: true });
    await source.query(
      "INSERT INTO revisiones_publicacion VALUES ($1,$2,NULL)",
      [c, at(4)],
    );
    await source.query(
      "UPDATE establecimientos_turisticos SET fecha_solicitud=$2 WHERE id=$1",
      [e, at(5)],
    );
    await source.query(
      "INSERT INTO auditoria_fichas VALUES ($1,8,'MODIFICAR',$2)",
      [c, at(23)],
    );
    const result = await service.summary(7, true);
    expect(result.establishments.pending).toBe(3);
    expect(result.review).toEqual({ pending: 2, latestChange: at(5) });
    expect(result.centers.latestChange).toBe(at(23));
  });

  it("scopes histories by record owner and preserves deletion timestamps without counting deleted rows", async () => {
    const owned = await center("BORRADOR", 7, "BORRADOR");
    await center("BORRADOR", 8, undefined, { hour: 23 });
    await center("BORRADOR", null, undefined, { hour: 22 });
    const deleted = await center("EN_REVISION", 7, undefined, {
      deleted: true,
      hour: 9,
    });
    await source.query(
      "UPDATE borradores_centros_turisticos SET updated_at=$2 WHERE centro_turistico_id=$1",
      [owned, at(10)],
    );
    await source.query(
      "INSERT INTO auditoria_fichas VALUES ($1,8,'ELIMINAR_MULTIMEDIA',$2),($3,8,'ELIMINAR',$4)",
      [owned, at(11), deleted, at(12)],
    );
    const e = await establishment("BORRADOR", 7);
    const de = await establishment("EN_REVISION", 7, {
      deleted: true,
      hour: 14,
    });
    await establishment("RECHAZADO", 8, { hour: 23 });
    await source.query(
      "INSERT INTO auditoria_catalogos VALUES ($1,8,'ESTABLISHMENT','MODIFICAR',$2),($3,8,'ESTABLISHMENT','ELIMINAR',$4)",
      [e, at(13), de, at(15)],
    );
    const agent = await service.summary(7, false);
    expect(agent.centers).toEqual({ pending: 1, latestChange: at(12) });
    expect(agent.establishments).toEqual({ pending: 1, latestChange: at(15) });
    for (const key of ["review", "opinions", "catalogs"] as const)
      expect(agent[key]).toEqual({ pending: 0, latestChange: null });
    const admin = await service.summary(1, true);
    expect(admin.centers.latestChange).toBe(at(23));
    expect(admin.establishments.latestChange).toBe(at(23));
  });

  it("detects draft-only updates and review decisions independently of center timestamps", async () => {
    const c = await center("PUBLICADO", 7, "BORRADOR");
    await source.query(
      "UPDATE borradores_centros_turisticos SET updated_at=$2 WHERE centro_turistico_id=$1",
      [c, at(18)],
    );
    await source.query("INSERT INTO revisiones_publicacion VALUES ($1,$2,$3)", [
      c,
      at(3),
      at(17),
    ]);
    const result = await service.summary(7, true);
    expect(result.centers.latestChange).toBe(at(18));
    expect(result.review).toEqual({ pending: 0, latestChange: at(17) });
  });

  it("counts pending opinion versions once, including edits to approved opinions", async () => {
    await source.query(`INSERT INTO opiniones (estado_moderacion,eliminado_at) VALUES
      ('PENDIENTE',NULL),('APROBADA',NULL),('APROBADA',NULL),('RECHAZADA',NULL),
      ('PENDIENTE','2026-10-04T21:00:00Z')`);
    await source.query(`INSERT INTO opinion_versiones VALUES
      (1,'PENDIENTE','2026-10-04T02:00:00Z',NULL),
      (2,'APROBADA','2026-10-04T03:00:00Z','2026-10-04T04:00:00Z'),
      (2,'PENDIENTE','2026-10-04T05:00:00Z',NULL),
      (3,'APROBADA','2026-10-04T06:00:00Z','2026-10-04T07:00:00Z'),
      (4,'RECHAZADA','2026-10-04T08:00:00Z','2026-10-04T09:00:00Z'),
      (5,'PENDIENTE','2026-10-04T10:00:00Z',NULL)`);
    await source.query(
      `INSERT INTO moderaciones_opinion VALUES (2,'2026-10-04T11:00:00Z'),(2,'2026-10-04T12:00:00Z')`,
    );
    expect((await service.summary(7, true)).opinions).toEqual({
      pending: 2,
      latestChange: at(21),
    });
    expect((await service.summary(7, false)).opinions).toEqual({
      pending: 0,
      latestChange: null,
    });
  });

  it("treats catalogs as news only and excludes establishment audit events from their marker", async () => {
    await source.query(`INSERT INTO auditoria_catalogos VALUES
      (1,1,'ACCESSIBILITY','CREAR','2026-10-04T04:00:00Z'),
      (2,1,'ESTABLISHMENT_CATEGORY','ELIMINAR','2026-10-04T07:00:00Z'),
      (3,1,'ESTABLISHMENT','MODIFICAR','2026-10-04T23:00:00Z')`);
    expect((await service.summary(1, true)).catalogs).toEqual({
      pending: 0,
      latestChange: at(7),
    });
    expect((await service.summary(7, false)).catalogs).toEqual({
      pending: 0,
      latestChange: null,
    });
  });
});
