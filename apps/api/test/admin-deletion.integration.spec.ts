import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { DataSource, type EntityManager } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";
import { AdminCentersQueryDto } from "../src/admin/admin.dto";
import { PostgresPublicCenterRepository } from "../src/centers/infrastructure/postgres-public-center.repository";
import {
  AdminEstablishmentsQueryDto,
  PublicEstablishmentsQueryDto,
} from "../src/establishments/establishments.dto";
import { EstablishmentsService } from "../src/establishments/establishments.service";
import { OpinionsService } from "../src/opinions/opinions.service";

// These tests retain historical fixtures. The runner owns and removes the entire
// disposable cluster; no application environment or password file is consulted.
const socket = process.env.ADMIN_DELETION_TEST_PGHOST;
const isolatedSocket = /^\/tmp\/turismo-admin-delete-check-[a-z0-9-]+$/i.test(
  socket ?? "",
);
const port = Number(process.env.ADMIN_DELETION_TEST_PGPORT ?? "55492");
const runId = randomUUID().slice(0, 8);
const invalidActor = -1;

type CenterFixture = { id: string; code: string; name: string };
type Row = Record<string, unknown>;

describe.skipIf(!isolatedSocket)(
  "administrative deletion with PostgreSQL",
  () => {
    let source: DataSource;
    let centers: AdminCentersService;
    let establishments: EstablishmentsService;
    let opinions: OpinionsService;
    let publicCenters: PostgresPublicCenterRepository;
    let administrator: number;
    let visitor: number;
    let geography: {
      subtypeId: number;
      touristZoneId: number;
      parishId: number;
      productLineId: number;
      scenarioId: number;
      localityId: number;
      activityId: number;
      activityGroupId: number;
      facilityCategoryId: number;
    };
    let fixtureSequence = 0;

    async function one<T extends Row>(sql: string, parameters: unknown[] = []) {
      const rows = await source.query<T[]>(sql, parameters);
      if (!rows[0])
        throw new Error("Integration fixture query returned no rows.");
      return rows[0];
    }

    function fixtureName(label: string) {
      fixtureSequence += 1;
      return `${label} ${runId} ${fixtureSequence}`;
    }

    async function expectDeletionWaitsForAssignment(
      catalog: string,
      id: number,
      assignment: (manager: EntityManager) => Promise<unknown>,
    ) {
      const assigning = source.createQueryRunner();
      const deleting = source.createQueryRunner();
      let deletion: Promise<unknown> | undefined;
      try {
        await assigning.connect();
        await deleting.connect();
        await assigning.startTransaction();
        await deleting.startTransaction();
        const [{ pid }] = (await deleting.manager.query(
          "SELECT pg_backend_pid() AS pid",
        )) as Array<{ pid: number }>;
        await assignment(assigning.manager);
        const deletionService = new AdminCentersService({
          transaction: async (
            callback: (manager: EntityManager) => Promise<unknown>,
          ) => callback(deleting.manager),
        } as DataSource);
        deletion = deletionService
          .deleteCatalog(administrator, catalog, id)
          .then(
            (result) => ({ result }),
            (error: unknown) => ({ error }),
          );
        let blocked = false;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const activity = await one<{ waiting: boolean }>(
            "SELECT wait_event_type = 'Lock' AS waiting FROM pg_stat_activity WHERE pid = $1",
            [pid],
          );
          if (activity.waiting) {
            blocked = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        expect(blocked).toBe(true);
        await assigning.commitTransaction();
        expect(await deletion).toEqual({
          result: { catalog, id, deleted: true },
        });
        await deleting.commitTransaction();
      } finally {
        if (assigning.isTransactionActive)
          await assigning.rollbackTransaction();
        if (deletion) await deletion;
        if (deleting.isTransactionActive) await deleting.rollbackTransaction();
        await assigning.release();
        await deleting.release();
      }
    }

    async function createCenter(published = false): Promise<CenterFixture> {
      const name = fixtureName("Centro de integración");
      const created = await centers.create(administrator, {
        name,
        subtypeId: geography.subtypeId,
        touristZoneId: geography.touristZoneId,
        parishId: geography.parishId,
        productLineId: geography.productLineId,
        scenarioId: geography.scenarioId,
        latitude: -1.59263,
        longitude: -79.00098,
      });
      if (!created.code)
        throw new Error("The center fixture has no public code.");
      const row = await one<{ id: string }>(
        "SELECT id FROM centros_turisticos WHERE TRIM(codigo_atractivo) = $1",
        [created.code],
      );
      if (published) {
        // Publication is a fixture precondition, separate from deletion. This
        // avoids valuation/demo seeds and keeps the service-created draft intact.
        await source.query(
          `UPDATE centros_turisticos
            SET estado_resenia_id = (SELECT id FROM estados_resenia WHERE codigo = 'PUBLICADO'),
                publicado_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
          [row.id],
        );
      }
      return { id: row.id, code: created.code, name };
    }

    async function createEstablishment(
      taxonomy: { classificationId?: number; categoryId?: number } = {},
    ) {
      return establishments.create(administrator, {
        nombreComercial: fixtureName("Catastro de integración"),
        localityId: geography.localityId,
        activityId: geography.activityId,
        ...taxonomy,
        latitude: -1.59263,
        longitude: -79.00098,
      });
    }

    async function createOpinion(center: CenterFixture, rating = 5) {
      await opinions.create(center.code, visitor, {
        rating,
        comment: fixtureName("Opinión de integración"),
      });
      return one<{
        id: string;
        reviewCode: string;
        publishedVersionId: string | null;
      }>(
        `SELECT o.id, v.codigo_publico::text AS "reviewCode",
              o.version_publicada_id AS "publishedVersionId"
         FROM opiniones o
         JOIN opinion_versiones v ON v.opinion_id = o.id
        WHERE o.usuario_id = $1 AND o.centro_turistico_id = $2
          AND o.eliminado_at IS NULL
        ORDER BY v.numero_version DESC LIMIT 1`,
        [visitor, center.id],
      );
    }

    beforeAll(async () => {
      source = new DataSource({
        type: "postgres",
        host: socket!,
        port,
        username: "admin_delete_test",
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
        username: "admin_delete_test",
        address: null,
      });
      const ids = await source.query<Array<{ id: string }>>(
        `INSERT INTO usuarios (nombre, email, password)
       VALUES ($1, $2, 'unused-integration-password'),
              ($3, $4, 'unused-integration-password')
       RETURNING id`,
        [
          `Administrador ${runId}`,
          `admin-${runId}@example.invalid`,
          `Visitante ${runId}`,
          `visitor-${runId}@example.invalid`,
        ],
      );
      administrator = Number(ids[0].id);
      visitor = Number(ids[1].id);
      await source.query(
        `INSERT INTO usuarios_roles (usuario_id, rol_id)
       SELECT $1::bigint, id FROM roles WHERE nombre_rol = 'ADMINISTRADOR'
       UNION ALL
       SELECT $2::bigint, id FROM roles WHERE nombre_rol = 'TURISTA'`,
        [administrator, visitor],
      );
      const territory = await one<Record<string, string>>(
        `SELECT c.subtipo_atractivo_id AS "subtypeId",
              c.zona_turistica_id AS "touristZoneId",
              c.parroquia_id AS "parishId", c.linea_producto_id AS "productLineId",
              c.escenario_id AS "scenarioId", z.localidad_id AS "localityId",
              (SELECT id FROM catalogo_catastro_actividades WHERE activo LIMIT 1) AS "activityId",
              (SELECT ga.id FROM grupos_actividad ga
                 JOIN tipos_atractivo t ON t.categoria_id = ga.categoria_atractivo_id
                 JOIN subtipos_atractivo st ON st.tipo_atractivo_id = t.id
                WHERE st.id = c.subtipo_atractivo_id AND ga.activo LIMIT 1) AS "activityGroupId",
              (SELECT id FROM categorias_facilidad WHERE activo LIMIT 1) AS "facilityCategoryId"
         FROM centros_turisticos c
         JOIN zonas_turisticas z ON z.id = c.zona_turistica_id
        WHERE c.nombre = 'Mirador turístico de Guaranda' AND c.eliminado_at IS NULL`,
      );
      geography = Object.fromEntries(
        Object.entries(territory).map(([key, value]) => [key, Number(value)]),
      ) as typeof geography;
      expect(
        Object.values(geography).every((id) => Number.isInteger(id) && id > 0),
      ).toBe(true);
      centers = new AdminCentersService(source);
      establishments = new EstablishmentsService(source);
      opinions = new OpinionsService(source);
      publicCenters = new PostgresPublicCenterRepository(source);
    });

    afterAll(async () => {
      if (source?.isInitialized) await source.destroy();
    });

    it("removes centers from inventory and public reads while retaining drafts, revisions, favorites and audit", async () => {
      const center = await createCenter(true);
      await centers.submitReview(center.code, administrator);
      await source.query(
        "INSERT INTO favoritos_centros (usuario_id, centro_turistico_id) VALUES ($1, $2)",
        [visitor, center.id],
      );
      const listQuery = Object.assign(new AdminCentersQueryDto(), {
        q: center.name,
      });
      expect((await centers.list(listQuery)).total).toBe(1);
      expect(
        await publicCenters.findPublishedByCode(center.code),
      ).not.toBeNull();
      const summaryBefore = await centers.summary();

      await expect(
        centers.deleteCenter(center.code, administrator),
      ).resolves.toEqual({ code: center.code, deleted: true });
      await expect(
        centers.deleteCenter(center.code, administrator),
      ).resolves.toEqual({ code: center.code, deleted: true });

      expect((await centers.list(listQuery)).total).toBe(0);
      expect((await centers.summary()).total).toBe(summaryBefore.total - 1);
      expect(await publicCenters.findPublishedByCode(center.code)).toBeNull();
      const retained = await one<{
        activo: boolean;
        eliminado_at: Date;
        drafts: number;
        revisions: number;
        favorites: number;
      }>(
        `SELECT activo, eliminado_at,
              (SELECT COUNT(*)::int FROM borradores_centros_turisticos WHERE centro_turistico_id = c.id) AS drafts,
              (SELECT COUNT(*)::int FROM revisiones_publicacion WHERE centro_turistico_id = c.id) AS revisions,
              (SELECT COUNT(*)::int FROM favoritos_centros WHERE centro_turistico_id = c.id) AS favorites
         FROM centros_turisticos c WHERE id = $1`,
        [center.id],
      );
      expect(retained.activo).toBe(false);
      expect(retained.eliminado_at).not.toBeNull();
      expect(retained).toMatchObject({ drafts: 1, revisions: 1, favorites: 1 });
      const audit = await centers.getAudit(center.code);
      expect(
        audit.items.filter(
          (item: { action: string }) => item.action === "ELIMINAR",
        ),
      ).toHaveLength(1);
      expect(audit.items).toContainEqual(
        expect.objectContaining({
          action: "ELIMINAR",
          previous: expect.objectContaining({
            nombre: center.name,
            activo: true,
            eliminado_at: null,
          }),
          next: expect.objectContaining({
            nombre: center.name,
            activo: false,
            eliminado_at: expect.any(String),
          }),
        }),
      );
      for (const operation of [
        () => centers.find(center.code),
        () => centers.sections(center.code),
        () => centers.valuation(center.code),
        () =>
          centers.save(center.code, administrator, { name: "Cambio obsoleto" }),
        () => centers.submitReview(center.code, administrator),
        () => centers.publish(center.code, administrator),
        () => centers.reactivate(center.code, administrator),
      ])
        await expect(operation()).rejects.toMatchObject({ status: 404 });
      // The existing state trigger corrects a bare activation request back to
      // false. A simultaneous state change must still fail the new CHECK.
      await source.query(
        "UPDATE centros_turisticos SET activo = TRUE WHERE id = $1",
        [center.id],
      );
      expect(
        (
          await one<{ activo: boolean }>(
            "SELECT activo FROM centros_turisticos WHERE id = $1",
            [center.id],
          )
        ).activo,
      ).toBe(false);
      await expect(
        source.query(
          `UPDATE centros_turisticos SET activo = TRUE,
                estado_resenia_id = (SELECT id FROM estados_resenia WHERE codigo = 'PUBLICADO')
          WHERE id = $1`,
          [center.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: "23514" } });
    });

    it("removes establishments from administrative and public lists while retaining their audit", async () => {
      const establishment = await createEstablishment();
      const query = Object.assign(new AdminEstablishmentsQueryDto(), {
        q: establishment.nombreComercial,
      });
      const publicQuery = Object.assign(new PublicEstablishmentsQueryDto(), {
        activity: establishment.actividad,
        localityId: geography.localityId,
      });
      expect((await establishments.list(query)).total).toBe(1);
      expect((await establishments.nearby(publicQuery)).items).toContainEqual(
        expect.objectContaining({
          nombreComercial: establishment.nombreComercial,
        }),
      );

      await expect(
        establishments.remove(String(establishment.id), administrator),
      ).resolves.toEqual({ id: establishment.id, deleted: true });
      await expect(
        establishments.remove(String(establishment.id), administrator),
      ).resolves.toEqual({ id: establishment.id, deleted: true });

      expect((await establishments.list(query)).total).toBe(0);
      expect(
        (await establishments.nearby(publicQuery)).items,
      ).not.toContainEqual(
        expect.objectContaining({
          nombreComercial: establishment.nombreComercial,
        }),
      );
      const retained = await one<{ activo: boolean; eliminado_at: Date }>(
        "SELECT activo, eliminado_at FROM establecimientos_turisticos WHERE id = $1",
        [establishment.id],
      );
      expect(retained.activo).toBe(false);
      expect(retained.eliminado_at).not.toBeNull();
      expect(
        (await establishments.getAudit(String(establishment.id))).items,
      ).toContainEqual(
        expect.objectContaining({
          action: "ELIMINAR",
          previous: expect.objectContaining({
            nombreComercial: establishment.nombreComercial,
            active: true,
          }),
          next: expect.objectContaining({
            nombreComercial: establishment.nombreComercial,
            active: false,
            deletedAt: expect.any(String),
          }),
        }),
      );
      expect(
        (await establishments.getAudit(String(establishment.id))).items.filter(
          (item: { action: string }) => item.action === "ELIMINAR",
        ),
      ).toHaveLength(1);
      for (const operation of [
        () => establishments.find(String(establishment.id)),
        () =>
          establishments.save(String(establishment.id), administrator, {
            nombreComercial: "Cambio obsoleto",
          }),
        () =>
          establishments.submitReview(String(establishment.id), administrator),
        () =>
          establishments.setActive(
            String(establishment.id),
            administrator,
            true,
          ),
      ])
        await expect(operation()).rejects.toMatchObject({ status: 404 });
      await expect(
        source.query(
          "UPDATE establecimientos_turisticos SET activo = TRUE WHERE id = $1",
          [establishment.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: "23514" } });
    });

    it("blocks classification deletion until its categories are removed and preserves establishment references", async () => {
      const classification = await centers.createCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        { name: fixtureName("Clasificación"), parentId: geography.activityId },
      );
      const category = await centers.createCatalog(
        administrator,
        "ESTABLISHMENT_CATEGORY",
        { name: fixtureName("Categoría"), parentId: classification.id },
      );
      const establishment = await createEstablishment({
        classificationId: classification.id,
        categoryId: category.id,
      });

      await expect(
        centers.deleteCatalog(
          administrator,
          "ESTABLISHMENT_CLASSIFICATION",
          classification.id,
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (
          await one<{ eliminado_at: null }>(
            "SELECT eliminado_at FROM catalogo_catastro_clasificaciones WHERE id = $1",
            [classification.id],
          )
        ).eliminado_at,
      ).toBeNull();
      await centers.deleteCatalog(
        administrator,
        "ESTABLISHMENT_CATEGORY",
        category.id,
      );
      await centers.deleteCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        classification.id,
      );
      await centers.deleteCatalog(
        administrator,
        "ESTABLISHMENT_CATEGORY",
        category.id,
      );
      await centers.deleteCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        classification.id,
      );
      const catalog = await centers.catalogs({ includeInactive: true });
      expect(
        catalog.establishmentCategories.some(
          (entry: { id: string }) => Number(entry.id) === category.id,
        ),
      ).toBe(false);
      expect(
        catalog.establishmentClassifications.some(
          (entry: { id: string }) => Number(entry.id) === classification.id,
        ),
      ).toBe(false);
      expect(await establishments.find(String(establishment.id))).toMatchObject(
        {
          classificationId: classification.id,
          categoryId: category.id,
          active: true,
        },
      );
      await expect(
        establishments.save(String(establishment.id), administrator, {
          nombreComercial: fixtureName("Catastro conservado"),
          activityId: geography.activityId,
          classificationId: classification.id,
          categoryId: category.id,
        }),
      ).resolves.toMatchObject({
        classificationId: classification.id,
        categoryId: category.id,
      });
      await expect(
        createEstablishment({
          classificationId: classification.id,
          categoryId: category.id,
        }),
      ).rejects.toMatchObject({ status: 400 });
      const replacement = await centers.createCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        {
          name: fixtureName("Clasificación reemplazo"),
          parentId: geography.activityId,
        },
      );
      await expect(
        establishments.save(String(establishment.id), administrator, {
          classificationId: replacement.id,
        }),
      ).resolves.toMatchObject({
        classificationId: replacement.id,
        categoryId: null,
      });
      await expect(
        establishments.save(String(establishment.id), administrator, {
          classificationId: classification.id,
        }),
      ).rejects.toMatchObject({ status: 400 });
      for (const [key, table, id] of [
        [
          "ESTABLISHMENT_CLASSIFICATION",
          "catalogo_catastro_clasificaciones",
          classification.id,
        ],
        ["ESTABLISHMENT_CATEGORY", "catalogo_catastro_categorias", category.id],
      ] as const) {
        const row = await one<{ activo: boolean; eliminado_at: Date }>(
          `SELECT activo, eliminado_at FROM ${table} WHERE id = $1`,
          [id],
        );
        expect(row.activo).toBe(false);
        expect(row.eliminado_at).not.toBeNull();
        expect(
          (
            await one<{ total: number }>(
              "SELECT COUNT(*)::int AS total FROM auditoria_catalogos WHERE catalogo_codigo = $1 AND registro_id = $2 AND accion = 'ELIMINAR'",
              [key, id],
            )
          ).total,
        ).toBe(1);
        await expect(
          centers.updateCatalog(administrator, key, id, { active: true }),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          source.query(`UPDATE ${table} SET activo = TRUE WHERE id = $1`, [id]),
        ).rejects.toMatchObject({ driverError: { code: "23514" } });
      }
      await expect(
        centers.createCatalog(administrator, "ESTABLISHMENT_CATEGORY", {
          name: fixtureName("Categoría obsoleta"),
          parentId: classification.id,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it.each(["inactive", "deleted"] as const)(
      "preserves %s center catalogs through editing, review and publication while rejecting new assignments",
      async (retirement) => {
        const center = await createCenter();
        const activity = await centers.createCatalog(
          administrator,
          "ACTIVITY",
          {
            name: fixtureName("Act hist"),
            parentId: geography.activityGroupId,
          },
        );
        const accessibility = await centers.createCatalog(
          administrator,
          "ACCESSIBILITY",
          {
            name: fixtureName("Acc hist"),
          },
        );
        const facility = await centers.createCatalog(
          administrator,
          "FACILITY",
          {
            name: fixtureName("Fac hist"),
            parentId: geography.facilityCategoryId,
          },
        );
        const criterion = await one<{ id: number }>(
          `INSERT INTO criterios_accesibilidad (tipo_accesibilidad_id, codigo, descripcion, orden)
           VALUES ($1, $2, $3, 1) RETURNING id::int AS id`,
          [
            accessibility.id,
            `CRITERION_${runId}_${fixtureSequence}`,
            fixtureName("Criterio histórico"),
          ],
        );
        const selected = {
          activities: [{ activityId: activity.id, active: true }],
          accessibility: [{ typeId: accessibility.id, applies: true }],
          facilities: [{ typeId: facility.id, quantity: 1 }],
          sections: {
            planta: {
              schemaVersion: 1,
              response: "SI",
              facilitiesDetails: [{ typeId: facility.id, quantity: 1 }],
            },
            accesibilidad: {
              schemaVersion: 1,
              response: "SI",
              accessibilityDetails: {
                criteria: [
                  {
                    criterionId: criterion.id,
                    accessibilityTypeId: accessibility.id,
                    response: "SI",
                  },
                ],
              },
            },
          },
        };
        await centers.save(center.code, administrator, selected);
        for (const [key, id] of [
          ["ACTIVITY", activity.id],
          ["ACCESSIBILITY", accessibility.id],
          ["FACILITY", facility.id],
        ] as const) {
          if (retirement === "deleted")
            await centers.deleteCatalog(administrator, key, id);
          else
            await centers.updateCatalog(administrator, key, id, {
              active: false,
            });
        }
        const saved = await centers.save(center.code, administrator, {
          name: fixtureName("Centro actualizado"),
        });
        expect(saved.draft).toMatchObject(selected);
        expect(saved.retainedCatalogOptions).toMatchObject({
          activities: [
            expect.objectContaining({
              id: activity.id,
              name: activity.name,
              active: false,
            }),
          ],
          accessibilityTypes: [
            expect.objectContaining({
              id: accessibility.id,
              name: accessibility.name,
              active: false,
            }),
          ],
          accessibilityCriteria: [
            expect.objectContaining({
              id: criterion.id,
              typeId: accessibility.id,
              active: false,
            }),
          ],
          facilities: [
            expect.objectContaining({
              id: facility.id,
              categoryId: geography.facilityCategoryId,
              active: false,
            }),
          ],
        });
        const sectionSaved = await centers.saveSection(
          center.code,
          "descripcion",
          administrator,
          {
            content: {
              schemaVersion: 1,
              response: "SI",
              observation: "Cambio ajeno al catálogo",
            },
          },
        );
        expect(sectionSaved.draft).toMatchObject(selected);
        const catalog = await centers.catalogs();
        expect(
          catalog.accessibilityCriteria.some(
            (entry: { id: string }) => Number(entry.id) === criterion.id,
          ),
        ).toBe(false);
        const fresh = await createCenter();
        for (const input of [
          { activities: selected.activities },
          { accessibility: selected.accessibility },
          { facilities: selected.facilities },
          { sections: { planta: selected.sections.planta } },
          { sections: { accesibilidad: selected.sections.accesibilidad } },
        ])
          await expect(
            centers.save(fresh.code, administrator, input),
          ).rejects.toMatchObject({ status: 409 });

        await centers.submitReview(center.code, administrator);
        const published = await centers.review(center.code, administrator, {
          action: "APPROVE",
        });
        expect(published.published).toMatchObject({
          activities: selected.activities,
          accessibility: selected.accessibility,
          facilities: selected.facilities,
        });
        await source.query(
          `UPDATE borradores_centros_turisticos SET datos = jsonb_build_object('name', $2::text),
                  estado_resenia_id = (SELECT id FROM estados_resenia WHERE codigo = 'BORRADOR')
            WHERE centro_turistico_id = $1`,
          [center.id, fixtureName("Borrador parcial")],
        );
        await expect(
          centers.save(center.code, administrator, {
            description: "Edición con borrador parcial",
          }),
        ).resolves.toMatchObject({
          draft: {
            activities: selected.activities,
            accessibility: selected.accessibility,
            facilities: selected.facilities,
          },
        });
        await centers.save(center.code, administrator, {
          activities: [],
          accessibility: [],
          facilities: [],
          sections: {
            planta: { response: "NO_APLICA" },
            accesibilidad: { response: "NO_APLICA" },
          },
        });
        await expect(
          centers.save(center.code, administrator, selected),
        ).rejects.toMatchObject({ status: 409 });
      },
    );

    it("preserves inactive Catastro taxonomy on unrelated edits and rejects it on new assignments", async () => {
      const classification = await centers.createCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        {
          name: fixtureName("Clasificación inactiva"),
          parentId: geography.activityId,
        },
      );
      const category = await centers.createCatalog(
        administrator,
        "ESTABLISHMENT_CATEGORY",
        {
          name: fixtureName("Categoría inactiva"),
          parentId: classification.id,
        },
      );
      const establishment = await createEstablishment({
        classificationId: classification.id,
        categoryId: category.id,
      });
      await centers.updateCatalog(
        administrator,
        "ESTABLISHMENT_CATEGORY",
        category.id,
        { active: false },
      );
      await centers.updateCatalog(
        administrator,
        "ESTABLISHMENT_CLASSIFICATION",
        classification.id,
        { active: false },
      );
      await expect(
        establishments.save(String(establishment.id), administrator, {
          nombreComercial: fixtureName("Catastro actualizado"),
          activityId: geography.activityId,
          classificationId: classification.id,
          categoryId: category.id,
        }),
      ).resolves.toMatchObject({
        classificationId: classification.id,
        categoryId: category.id,
      });
      await expect(
        createEstablishment({
          classificationId: classification.id,
          categoryId: category.id,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it.each(["ACTIVITY", "ACCESSIBILITY", "FACILITY"] as const)(
      "holds the %s option until the center assignment commits",
      async (catalog) => {
        const center = await createCenter();
        const option = await centers.createCatalog(administrator, catalog, {
          name: fixtureName("Locked option"),
          ...(catalog === "ACTIVITY"
            ? { parentId: geography.activityGroupId }
            : {}),
          ...(catalog === "FACILITY"
            ? { parentId: geography.facilityCategoryId }
            : {}),
        });
        await expectDeletionWaitsForAssignment(
          catalog,
          option.id,
          (manager) => {
            const assigningService = new AdminCentersService({
              transaction: async (
                callback: (value: EntityManager) => Promise<unknown>,
              ) => callback(manager),
            } as DataSource);
            const input =
              catalog === "ACTIVITY"
                ? { activities: [{ activityId: option.id, active: true }] }
                : catalog === "ACCESSIBILITY"
                  ? { accessibility: [{ typeId: option.id, applies: true }] }
                  : { facilities: [{ typeId: option.id, quantity: 1 }] };
            return assigningService.save(center.code, administrator, input);
          },
        );
        expect((await centers.find(center.code)).draft).not.toBeNull();
      },
    );

    it.each([
      "ESTABLISHMENT_CLASSIFICATION",
      "ESTABLISHMENT_CATEGORY",
    ] as const)(
      "holds the %s option until the Catastro assignment commits",
      async (catalog) => {
        const classification = await centers.createCatalog(
          administrator,
          "ESTABLISHMENT_CLASSIFICATION",
          {
            name: fixtureName("Clasificación bloqueada"),
            parentId: geography.activityId,
          },
        );
        const category =
          catalog === "ESTABLISHMENT_CATEGORY"
            ? await centers.createCatalog(administrator, catalog, {
                name: fixtureName("Categoría bloqueada"),
                parentId: classification.id,
              })
            : null;
        await expectDeletionWaitsForAssignment(
          catalog,
          category?.id ?? classification.id,
          (manager) => {
            const assigningService = new EstablishmentsService({
              transaction: async (
                callback: (value: EntityManager) => Promise<unknown>,
              ) => callback(manager),
            } as DataSource);
            return assigningService.create(administrator, {
              nombreComercial: fixtureName("Catastro bloqueado"),
              localityId: geography.localityId,
              activityId: geography.activityId,
              classificationId: classification.id,
              ...(category ? { categoryId: category.id } : {}),
              latitude: -1.59263,
              longitude: -79.00098,
            });
          },
        );
      },
    );

    it.each([
      [
        "ACCESSIBILITY",
        "tipos_accesibilidad",
        "accessibilityTypes",
        "centro_accesibilidad_resumen",
        "tipo_accesibilidad_id",
      ],
      [
        "ACTIVITY",
        "actividades_turisticas",
        "activities",
        "actividades_centro_turistico",
        "actividad_turistica_id",
      ],
      [
        "FACILITY",
        "tipos_facilidad",
        "facilities",
        "facilidades_centro",
        "tipo_facilidad_id",
      ],
    ] as const)(
      "retains historical center references when %s is removed",
      async (catalog, table, collection, relation, reference) => {
        const center = await createCenter();
        const option = await centers.createCatalog(administrator, catalog, {
          name: fixtureName(catalog),
          ...(catalog === "ACTIVITY"
            ? { parentId: geography.activityGroupId }
            : catalog === "FACILITY"
              ? { parentId: geography.facilityCategoryId }
              : {}),
        });
        await source.query(
          `INSERT INTO ${relation} (centro_turistico_id, ${reference}${catalog === "ACCESSIBILITY" ? ", aplica" : catalog === "ACTIVITY" ? ", activo" : ""}) VALUES ($1, $2${catalog === "FACILITY" ? "" : ", TRUE"})`,
          [center.id, option.id],
        );

        await centers.deleteCatalog(administrator, catalog, option.id);
        await centers.deleteCatalog(administrator, catalog, option.id);

        const audit = await one<{ previous: Row; next: Row }>(
          `SELECT datos_anteriores AS previous, datos_nuevos AS next
             FROM auditoria_catalogos WHERE catalogo_codigo = $1
              AND registro_id = $2 AND accion = 'ELIMINAR'`,
          [catalog, option.id],
        );
        expect(audit.previous).toMatchObject({
          id: option.id,
          activo: true,
          eliminado_at: null,
        });
        expect(audit.next).toMatchObject({
          id: option.id,
          activo: false,
          eliminado_at: expect.any(String),
        });

        const values = (await centers.catalogs({ includeInactive: true }))[
          collection
        ] as Array<{ id: string }>;
        expect(values.some((entry) => Number(entry.id) === option.id)).toBe(
          false,
        );
        expect(
          (
            await one<{ total: number }>(
              `SELECT COUNT(*)::int AS total FROM ${relation} WHERE centro_turistico_id = $1 AND ${reference} = $2`,
              [center.id, option.id],
            )
          ).total,
        ).toBe(1);
        const row = await one<{ activo: boolean; eliminado_at: Date }>(
          `SELECT activo, eliminado_at FROM ${table} WHERE id = $1`,
          [option.id],
        );
        expect(row.activo).toBe(false);
        expect(row.eliminado_at).not.toBeNull();
        await expect(
          centers.updateCatalog(administrator, catalog, option.id, {
            active: true,
          }),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          source.query(`UPDATE ${table} SET activo = TRUE WHERE id = $1`, [
            option.id,
          ]),
        ).rejects.toMatchObject({ driverError: { code: "23514" } });
      },
    );

    it("removes opinion ratings while retaining all versions, allows reposting and audits deletion once", async () => {
      const center = await createCenter(true);
      const original = await createOpinion(center, 5);
      await opinions.review(original.reviewCode, administrator, "APPROVE");
      await opinions.edit(center.code, visitor, {
        rating: 3,
        comment: "Segunda versión",
      });
      const edited = await one<{ reviewCode: string }>(
        'SELECT codigo_publico::text AS "reviewCode" FROM opinion_versiones WHERE opinion_id = $1 ORDER BY numero_version DESC LIMIT 1',
        [original.id],
      );
      await opinions.review(edited.reviewCode, administrator, "APPROVE");
      expect(
        (await opinions.listPublished(center.code, 20, 0)).summary,
      ).toMatchObject({ totalRatings: 1, averageRating: 3 });

      await opinions.remove(edited.reviewCode, administrator);
      await opinions.remove(original.reviewCode, administrator);

      expect(
        (await opinions.listPublished(center.code, 20, 0)).summary,
      ).toMatchObject({ total: 0, totalRatings: 0, averageRating: null });
      expect(
        (await opinions.listAdmin(50, 0)).items.some((item) =>
          [original.reviewCode, edited.reviewCode].includes(item.reviewCode),
        ),
      ).toBe(false);
      expect(await opinions.getOwn(center.code, visitor)).toBeNull();
      const retained = await one<{
        eliminado_at: Date;
        estado_moderacion: string;
        versions: number;
        deletions: number;
      }>(
        `SELECT eliminado_at, estado_moderacion,
              (SELECT COUNT(*)::int FROM opinion_versiones WHERE opinion_id = o.id) AS versions,
              (SELECT COUNT(*)::int FROM moderaciones_opinion WHERE opinion_id = o.id AND accion = 'ELIMINAR') AS deletions
         FROM opiniones o WHERE id = $1`,
        [original.id],
      );
      expect(retained).toMatchObject({
        estado_moderacion: "APROBADA",
        versions: 2,
        deletions: 1,
      });
      expect(retained.eliminado_at).not.toBeNull();
      const history = await opinions.getAdminHistory(original.reviewCode);
      expect(history.deletedAt).not.toBeNull();
      expect(history.versions).toHaveLength(2);
      expect(
        history.versions
          .flatMap((version) => version.moderations)
          .filter((moderation) => moderation.action === "ELIMINAR"),
      ).toHaveLength(1);
      await expect(
        opinions.review(edited.reviewCode, administrator, "APPROVE"),
      ).rejects.toMatchObject({ status: 409 });
      const replacement = await createOpinion(center, 4);
      expect(replacement.id).not.toBe(original.id);
      await opinions.review(replacement.reviewCode, administrator, "APPROVE");
      expect(
        (await opinions.listPublished(center.code, 20, 0)).summary,
      ).toMatchObject({
        total: 1,
        totalRatings: 1,
        averageRating: 4,
        distribution: { "3": 0, "4": 1 },
      });
      expect(
        (await opinions.getAdminHistory(original.reviewCode)).versions,
      ).toHaveLength(2);
    });

    it.each(["center", "establishment", "catalog", "opinion"] as const)(
      "rolls back %s removal when its audit actor violates a foreign key",
      async (domain) => {
        let remove: () => Promise<unknown>;
        let table: string;
        let id: string | number;
        if (domain === "center") {
          const center = await createCenter();
          table = "centros_turisticos";
          id = center.id;
          remove = () => centers.deleteCenter(center.code, invalidActor);
        } else if (domain === "establishment") {
          const establishment = await createEstablishment();
          table = "establecimientos_turisticos";
          id = establishment.id;
          remove = () =>
            establishments.remove(String(establishment.id), invalidActor);
        } else if (domain === "catalog") {
          const option = await centers.createCatalog(
            administrator,
            "ACCESSIBILITY",
            { name: fixtureName("Rollback") },
          );
          table = "tipos_accesibilidad";
          id = option.id;
          remove = () =>
            centers.deleteCatalog(invalidActor, "ACCESSIBILITY", option.id);
        } else {
          const center = await createCenter(true);
          const opinion = await createOpinion(center);
          table = "opiniones";
          id = opinion.id;
          remove = () => opinions.remove(opinion.reviewCode, invalidActor);
        }

        await expect(remove()).rejects.toMatchObject({
          driverError: { code: "23503" },
        });

        const row = await one<{ eliminado_at: null; activo?: boolean }>(
          `SELECT eliminado_at${domain === "opinion" ? "" : ", activo"} FROM ${table} WHERE id = $1`,
          [id],
        );
        expect(row.eliminado_at).toBeNull();
        if (domain !== "opinion") expect(row.activo).toBe(true);
      },
    );

    it("returns not found for deletion of unknown records", async () => {
      await expect(
        centers.deleteCenter("00000000000000000", administrator),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        centers.deleteCatalog(administrator, "FACILITY", 999999999),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        establishments.remove("999999999", administrator),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        opinions.remove(randomUUID(), administrator),
      ).rejects.toMatchObject({ status: 404 });
    });
  },
);
