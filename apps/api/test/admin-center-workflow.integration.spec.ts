import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DataSource, type EntityManager } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";
import { AdminCentersQueryDto } from "../src/admin/admin.dto";
import { PostgresPublicCenterRepository } from "../src/centers/infrastructure/postgres-public-center.repository";
import { MediaService } from "../src/files/media.service";

// Only the dedicated runner can enable these tests. No application env or .pgpass.
const socket = process.env.CENTER_WORKFLOW_TEST_PGHOST;
const isolatedSocket =
  /^\/tmp\/turismo-center-workflow-check-[a-z0-9-]+$/i.test(socket ?? "");
const prepare = process.env.CENTER_WORKFLOW_TEST_PHASE === "prepare";
const runId = randomUUID().slice(0, 8);

type CenterFixture = { id: string; code: string; name: string };
type Row = Record<string, unknown>;

describe.skipIf(!isolatedSocket)(
  "center workflow with PostgreSQL/PostGIS",
  () => {
    let source: DataSource;
    let centers: AdminCentersService;
    let media: MediaService;
    let publicCenters: PostgresPublicCenterRepository;
    let administrator: number;
    let agent: number;
    let geography: {
      subtypeId: number;
      touristZoneId: number;
      parishId: number;
      productLineId: number;
      scenarioId: number;
    };
    let sequence = 0;

    async function one<T extends Row>(sql: string, parameters: unknown[] = []) {
      const rows = await source.query<T[]>(sql, parameters);
      if (!rows[0]) throw new Error("Integration query returned no rows.");
      return rows[0];
    }

    async function createCenter(): Promise<CenterFixture> {
      sequence += 1;
      const name = `Ficha de flujo ${runId} ${sequence}`;
      const created = await centers.create(agent, {
        ...geography,
        name,
        latitude: -1.59263,
        longitude: -79.00098,
        description: "Descripción inicial verificada",
    });
    if (!created.code) throw new Error("The fixture has no institutional code.");
    expect(created.code).toHaveLength(17);
      const row = await one<{ id: string }>(
        "SELECT id FROM centros_turisticos WHERE TRIM(codigo_atractivo) = $1",
        [created.code],
      );
      return { id: row.id, code: created.code, name };
    }

    async function addPendingPhoto(center: CenterFixture) {
      return one<{ id: string }>(
        `INSERT INTO archivos_centro_turistico
        (centro_turistico_id, tipo_archivo_centro_id, nombre_original,
         ruta_archivo, proveedor_almacenamiento, mime_type, estado, subido_por)
       SELECT $1, id, 'fixture.png', $2, 'LOCAL', 'image/png', 'PENDIENTE', $3
       FROM tipos_archivo_centro_turistico WHERE codigo = 'FOTOGRAFIA'
       RETURNING id`,
        [center.id, `workflow/${center.id}/fixture.png`, agent],
      );
    }

    async function publish(center: CenterFixture) {
      await centers.submitReview(center.code, agent, false);
      return centers.review(center.code, administrator, { action: "APPROVE" });
    }

    async function snapshot(id: string) {
      return one<{ snapshot: Row }>(
        `SELECT jsonb_build_object(
        'center', to_jsonb(c),
        'draft', (SELECT to_jsonb(b) FROM borradores_centros_turisticos b WHERE b.centro_turistico_id = c.id),
        'revisions', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM revisiones_publicacion r WHERE r.centro_turistico_id = c.id), '[]'::jsonb),
        'audit', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM auditoria_fichas a WHERE a.centro_turistico_id = c.id), '[]'::jsonb),
        'media', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM archivos_centro_turistico m WHERE m.centro_turistico_id = c.id), '[]'::jsonb)
       ) AS snapshot FROM centros_turisticos c WHERE c.id = $1`,
        [id],
      );
    }

    beforeAll(async () => {
      source = new DataSource({
        type: "postgres",
        host: socket!,
        port: 55493,
        username: "center_workflow_test",
        database: "turismo_vinculacion_app",
        password: "",
        synchronize: false,
        migrationsRun: false,
        logging: false,
      });
      await source.initialize();
      expect(
        await one<{ database: string; username: string; address: null }>(
          `SELECT current_database() AS database, current_user AS username,
         inet_server_addr() AS address`,
        ),
      ).toEqual({
        database: "turismo_vinculacion_app",
        username: "center_workflow_test",
        address: null,
      });
      const users = await source.query<Array<{ id: string }>>(
        `INSERT INTO usuarios (nombre, email, password)
       VALUES ($1, $2, 'unused-fixture-password'), ($3, $4, 'unused-fixture-password')
       RETURNING id`,
        [
          `Administrador ${runId}`,
          `workflow-admin-${runId}@example.invalid`,
          `Agente ${runId}`,
          `workflow-agent-${runId}@example.invalid`,
        ],
      );
      administrator = Number(users[0].id);
      agent = Number(users[1].id);
      await source.query(
        `INSERT INTO usuarios_roles (usuario_id, rol_id)
       SELECT $1::bigint, id FROM roles WHERE nombre_rol = 'ADMINISTRADOR'
       UNION ALL
       SELECT $2::bigint, id FROM roles WHERE nombre_rol = 'AGENTE_TURISTICO'`,
        [administrator, agent],
      );
      const territory = await one<Record<string, string>>(
        `SELECT subtipo_atractivo_id AS "subtypeId", zona_turistica_id AS "touristZoneId",
       parroquia_id AS "parishId", linea_producto_id AS "productLineId",
       escenario_id AS "scenarioId"
       FROM centros_turisticos WHERE nombre = 'Mirador turístico de Guaranda'`,
      );
      geography = Object.fromEntries(
        Object.entries(territory).map(([key, value]) => [key, Number(value)]),
      ) as typeof geography;
      expect(Object.values(geography).every((id) => id > 0)).toBe(true);
      // Publication only changes metadata; no real provider or filesystem is used.
      media = new MediaService(source, {} as never, {} as never);
      centers = new AdminCentersService(source, media);
      publicCenters = new PostgresPublicCenterRepository(source);
    });

    afterAll(async () => {
      if (source?.isInitialized) await source.destroy();
    });

    it.skipIf(!prepare)(
      "prepares legacy states and immutable history before migration",
      async () => {
        await source.query(
          `CREATE TABLE center_workflow_qa_before (
       label text PRIMARY KEY, center_id bigint NOT NULL, code text NOT NULL,
       snapshot jsonb NOT NULL)`,
        );
        for (const [label, state, wasPublished] of [
          ["approved", "APROBADO", false],
          ["rejected", "RECHAZADO", false],
          ["inactive-public", "INACTIVO", true],
          ["inactive-draft", "INACTIVO", false],
        ] as const) {
          const center = await createCenter();
          await source.query(
            `UPDATE centros_turisticos SET estado_resenia_id = (
           SELECT id FROM estados_resenia WHERE codigo = $2),
         publicado_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = $1`,
            [center.id, state, wasPublished],
          );
          await source.query(
            `UPDATE borradores_centros_turisticos SET estado_resenia_id = (
         SELECT id FROM estados_resenia WHERE codigo = $2) WHERE centro_turistico_id = $1`,
            [center.id, state === "INACTIVO" ? "BORRADOR" : state],
          );
          await source.query(
            `INSERT INTO revisiones_publicacion
         (centro_turistico_id, solicitado_por, revisado_por, estado_resenia_id,
          datos_propuestos, observacion, fecha_solicitud, fecha_revision)
         SELECT $1, $2, $3, s.id, b.datos, 'Decisión histórica',
          CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '12 hours'
         FROM borradores_centros_turisticos b CROSS JOIN estados_resenia s
         WHERE b.centro_turistico_id = $1 AND s.codigo = $4`,
            [center.id, agent, administrator, state],
          );
          await source.query(
            `INSERT INTO auditoria_fichas
         (centro_turistico_id, usuario_id, accion, datos_nuevos)
         VALUES ($1, $2, $3, jsonb_build_object('estado', $4::text))`,
            [
              center.id,
              administrator,
              state === "RECHAZADO" ? "RECHAZAR" : "APROBAR",
              state,
            ],
          );
          const before = await snapshot(center.id);
          await source.query(
            "INSERT INTO center_workflow_qa_before VALUES ($1, $2, $3, $4::jsonb)",
            [label, center.id, center.code, JSON.stringify(before.snapshot)],
          );
        }
      },
    );

    describe.skipIf(prepare)("migrated workflow", () => {
      it("preserves IDs, institutional codes, snapshots and legacy history while cloning approved submissions", async () => {
        const fixtures = await source.query<
          Array<{
            label: string;
            center_id: string;
            code: string;
            snapshot: {
              center: Row;
              draft: Row;
              revisions: Row[];
              audit: Row[];
            };
          }>
        >("SELECT * FROM center_workflow_qa_before ORDER BY label");
        expect(fixtures).toHaveLength(4);
        for (const fixture of fixtures) {
          const current = await one<{
            id: string;
            code: string;
            state: string;
            active: boolean;
            draftId: string;
            draftState: string;
            data: Row;
            version: number;
          }>(
            `SELECT c.id, TRIM(c.codigo_atractivo) AS code, s.codigo AS state, c.activo AS active,
           b.id AS "draftId", bs.codigo AS "draftState", b.datos AS data, b.version
           FROM centros_turisticos c JOIN estados_resenia s ON s.id = c.estado_resenia_id
           JOIN borradores_centros_turisticos b ON b.centro_turistico_id = c.id
           JOIN estados_resenia bs ON bs.id = b.estado_resenia_id WHERE c.id = $1`,
            [fixture.center_id],
          );
          expect(current.id).toBe(fixture.center_id);
          expect(current.code).toBe(fixture.code);
          expect(current.code).toHaveLength(17);
          expect(Number(current.draftId)).toBe(fixture.snapshot.draft.id);
          expect(current.version).toBe(fixture.snapshot.draft.version);
          expect(current.data).toEqual(fixture.snapshot.draft.datos);
          const historical = await source.query<Row[]>(
            `SELECT to_jsonb(r) AS row FROM revisiones_publicacion r
           WHERE r.centro_turistico_id = $1 AND r.fecha_revision IS NOT NULL ORDER BY r.id`,
            [fixture.center_id],
          );
          expect(historical.map((row) => row.row)).toEqual(
            fixture.snapshot.revisions,
          );
          const audits = await source.query<Row[]>(
            "SELECT to_jsonb(a) AS row FROM auditoria_fichas a WHERE a.centro_turistico_id = $1 ORDER BY a.id",
            [fixture.center_id],
          );
          expect(audits.map((row) => row.row)).toEqual(fixture.snapshot.audit);
          expect(current.state).toBe(
            fixture.label === "approved"
              ? "EN_REVISION"
              : fixture.label === "inactive-public"
                ? "PUBLICADO"
                : "BORRADOR",
          );
          expect(current.active).toBe(!fixture.label.startsWith("inactive"));
          if (fixture.label === "approved") {
            const pending = await one<{
              data: Row;
              requester: string;
              state: string;
            }>(
              `SELECT r.datos_propuestos AS data, r.solicitado_por AS requester, s.codigo AS state
             FROM revisiones_publicacion r JOIN estados_resenia s ON s.id = r.estado_resenia_id
             WHERE r.centro_turistico_id = $1 AND r.fecha_revision IS NULL`,
              [fixture.center_id],
            );
            expect(pending.state).toBe("EN_REVISION");
            expect(pending.data).toEqual(fixture.snapshot.draft.datos);
            expect(Number(pending.requester)).toBe(
              fixture.snapshot.revisions[0].solicitado_por,
            );
          }
        }
        const beforeRepeat = await source.query<Row[]>(
          `SELECT to_jsonb(c) AS row FROM centros_turisticos c ORDER BY id`,
        );
        const beforeRevisions = await source.query<Row[]>(
          "SELECT to_jsonb(r) AS row FROM revisiones_publicacion r ORDER BY id",
        );
        const migration = await readFile(
          resolve(
            process.cwd(),
            "../../database/migrations/20261003_center_three_state_workflow.sql",
          ),
          "utf8",
        );
        await source.query(migration);
        expect(
          await source.query(
            "SELECT to_jsonb(c) AS row FROM centros_turisticos c ORDER BY id",
          ),
        ).toEqual(beforeRepeat);
        expect(
          await source.query(
            "SELECT to_jsonb(r) AS row FROM revisiones_publicacion r ORDER BY id",
          ),
        ).toEqual(beforeRevisions);
        const approved = fixtures.find(
          (fixture) => fixture.label === "approved",
        )!;
        expect(
          await centers.review(approved.code, administrator, {
            action: "APPROVE",
          }),
        ).toMatchObject({
          status: { code: "PUBLICADO" },
        });
      });

      it("publishes the submitted snapshot and pending media with one approval", async () => {
        const center = await createCenter();
        const photo = await addPendingPhoto(center);
        await centers.save(
          center.code,
          agent,
          { description: "Snapshot revisado" },
          false,
        );
        await centers.submitReview(center.code, agent, false);
        expect(await publicCenters.findPublishedByCode(center.code)).toBeNull();
        // A drift outside the service must never replace the submitted snapshot.
        await source.query(
          'UPDATE borradores_centros_turisticos SET datos = datos || \'{"description":"Cambio posterior"}\'::jsonb WHERE centro_turistico_id = $1',
          [center.id],
        );
        const approved = await centers.review(center.code, administrator, {
          action: "APPROVE",
        });
        expect(approved).toMatchObject({
          status: { code: "PUBLICADO" },
          baseStatus: { code: "PUBLICADO" },
          active: true,
          published: { description: "Snapshot revisado" },
          draft: null,
        });
        expect(approved.publishedAt).not.toBeNull();
        expect(
          await publicCenters.findPublishedByCode(center.code),
        ).toMatchObject({ description: "Snapshot revisado" });
        expect(
          await one(
            "SELECT estado FROM archivos_centro_turistico WHERE id = $1",
            [photo.id],
          ),
        ).toEqual({ estado: "PUBLICADO" });
        const audit = await centers.getAudit(center.code);
        expect(
          audit.items.map((entry: { action: string }) => entry.action),
        ).toEqual(
          expect.arrayContaining([
            "APROBAR",
            "PUBLICAR",
            "PUBLICAR_MULTIMEDIA",
          ]),
        );
        const beforeAcknowledgement = await snapshot(center.id);
        await centers.publish(center.code, administrator);
        expect(await snapshot(center.id)).toEqual(beforeAcknowledgement);
        await expect(
          centers.review(center.code, administrator, { action: "APPROVE" }),
        ).rejects.toMatchObject({ status: 409 });
      });

      it("rolls back public data, media, draft, revision and audit when media publication fails", async () => {
        const center = await createCenter();
        await publish(center);
        await centers.save(center.code, administrator, {
          description: "Propuesta que falla",
        });
        await centers.submitReview(center.code, administrator);
        await addPendingPhoto(center);
        const before = await snapshot(center.id);
        const failingMedia = {
          publishPending: async (
            manager: EntityManager,
            id: string,
            actor: number,
          ) => {
            await media.publishPending(manager, id, actor);
            throw new Error("Injected failure after media publication");
          },
      } as unknown as MediaService;
        const failing = new AdminCentersService(source, failingMedia);
        await expect(
          failing.review(center.code, administrator, { action: "APPROVE" }),
        ).rejects.toThrow("Injected failure");
        expect(await snapshot(center.id)).toEqual(before);
        expect(
          await publicCenters.findPublishedByCode(center.code),
        ).toMatchObject({ description: "Descripción inicial verificada" });
        await expect(
          centers.review(center.code, administrator, { action: "APPROVE" }),
        ).resolves.toMatchObject({ status: { code: "PUBLICADO" } });
      });

      it("returns rejection to draft with a reason, preserving the prior public version and allowing resubmission", async () => {
        const center = await createCenter();
        await publish(center);
        const publicBefore = await publicCenters.findPublishedByCode(
          center.code,
        );
        await centers.save(center.code, administrator, {
          description: "Propuesta corregible",
        });
        await centers.submitReview(center.code, administrator);
        const before = await snapshot(center.id);
        for (const observation of [undefined, "", "   "])
          await expect(
            centers.review(center.code, administrator, {
              action: "REJECT",
              observation,
            }),
          ).rejects.toMatchObject({ status: 409 });
        expect(await snapshot(center.id)).toEqual(before);
        const rejected = await centers.review(center.code, administrator, {
          action: "REJECT",
          observation: "  Verifica la descripción  ",
        });
        expect(rejected).toMatchObject({
          status: { code: "BORRADOR" },
          baseStatus: { code: "PUBLICADO" },
          draft: { description: "Propuesta corregible" },
          review: {
            status: { code: "BORRADOR" },
            observation: "Verifica la descripción",
          },
        });
        expect(await publicCenters.findPublishedByCode(center.code)).toEqual(
          publicBefore,
        );
        expect((await centers.getAudit(center.code)).items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: "RECHAZAR",
              next: {
                estado: "BORRADOR",
                observacion: "Verifica la descripción",
              },
            }),
          ]),
        );
        await centers.save(
          center.code,
          agent,
          { description: "Descripción corregida" },
          false,
        );
        await centers.submitReview(center.code, agent, false);
        await centers.review(center.code, administrator, { action: "APPROVE" });
        expect(
          await publicCenters.findPublishedByCode(center.code),
        ).toMatchObject({ description: "Descripción corregida" });
        expect(
          await one(
            "SELECT COUNT(*)::int AS total FROM revisiones_publicacion WHERE centro_turistico_id = $1",
            [center.id],
          ),
        ).toEqual({ total: 3 });
      });

      it("keeps visibility separate in draft, review and publication, including approval while inactive", async () => {
        const center = await createCenter();
        expect(
          await centers.deactivate(center.code, administrator),
        ).toMatchObject({ active: false, status: { code: "BORRADOR" } });
        expect(
          await centers.reactivate(center.code, administrator),
        ).toMatchObject({ active: true, status: { code: "BORRADOR" } });
        await centers.submitReview(center.code, agent, false);
        expect(
          await centers.deactivate(center.code, administrator),
        ).toMatchObject({ active: false, status: { code: "EN_REVISION" } });
        expect(
          await centers.review(center.code, administrator, {
            action: "APPROVE",
          }),
        ).toMatchObject({ active: false, status: { code: "PUBLICADO" } });
        expect(await publicCenters.findPublishedByCode(center.code)).toBeNull();
        const inactiveQuery = Object.assign(new AdminCentersQueryDto(), {
          q: center.name,
          active: false,
          status: "PUBLICADO",
        });
        expect((await centers.list(inactiveQuery)).items).toEqual([
          expect.objectContaining({
            code: center.code,
            active: false,
            status: { code: "PUBLICADO", name: "Publicado" },
          }),
        ]);
        expect(
          await centers.reactivate(center.code, administrator),
        ).toMatchObject({ active: true, status: { code: "PUBLICADO" } });
        expect(
          await publicCenters.findPublishedByCode(center.code),
        ).not.toBeNull();
        const activeQuery = Object.assign(new AdminCentersQueryDto(), {
          q: center.name,
          active: true,
        });
        expect((await centers.list(activeQuery)).total).toBe(1);
        expect((await centers.list(inactiveQuery)).total).toBe(0);
      });

      it("commits exactly one of two concurrent decisions on the same submission", async () => {
        const center = await createCenter();
        await centers.submitReview(center.code, agent, false);
        const results = await Promise.allSettled([
          centers.review(center.code, administrator, { action: "APPROVE" }),
          centers.review(center.code, administrator, {
            action: "REJECT",
            observation: "Revisión concurrente",
          }),
        ]);
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        const failure = results.find((result) => result.status === "rejected");
        expect(failure).toMatchObject({
          status: "rejected",
          reason: { status: 409 },
        });
        expect(
          await one(
            `SELECT COUNT(*)::int AS total FROM auditoria_fichas
         WHERE centro_turistico_id = $1 AND accion IN ('APROBAR', 'RECHAZAR')`,
            [center.id],
          ),
        ).toEqual({ total: 1 });
        expect(
          await one(
            `SELECT COUNT(*)::int AS total FROM revisiones_publicacion r
         JOIN estados_resenia s ON s.id = r.estado_resenia_id
         WHERE centro_turistico_id = $1 AND s.codigo = 'EN_REVISION'`,
            [center.id],
          ),
        ).toEqual({ total: 0 });
      });

      it("enforces agent ownership and freezes service edits during review", async () => {
        const center = await createCenter();
        await expect(
          centers.save(
            center.code,
            administrator,
            { name: "Otro agente" },
            false,
          ),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          centers.submitReview(center.code, administrator, false),
        ).rejects.toMatchObject({ status: 404 });
        await centers.submitReview(center.code, agent, false);
        await expect(
          centers.save(
            center.code,
            agent,
            { description: "Cambio en revisión" },
            false,
          ),
        ).rejects.toMatchObject({ status: 409 });
        await expect(
          centers.save(center.code, administrator, {
            description: "Cambio en revisión",
          }),
        ).rejects.toMatchObject({ status: 409 });
      });
    });
  },
);
