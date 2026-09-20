import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import type {
  AdminAccessibilityDto,
  AdminActivityDto,
  AdminAdmissionDto,
  AdminAdministrationDto,
  AdminCentersQueryDto,
  AdminCatalogsQueryDto,
  AdminCatalogUpdateDto,
  AdminCenterSectionCode,
  AdminCenterSectionProgress,
  AdminCenterSectionProgressStatus,
  AdminClimateDto,
  AdminFacilityDto,
  ReviewCenterDto,
  SaveAdminSectionDto,
  SaveAdminCenterDto,
} from "./admin.dto";
import { ADMIN_CENTER_SECTION_CODES } from "./admin.dto";
import { MediaService } from "../files/media.service";

type JsonRecord = Record<string, unknown>;
type CatalogKey = "ACCESSIBILITY" | "ACTIVITY" | "FACILITY";

const CATALOG_TARGETS: Record<CatalogKey, { table: string }> = {
  ACCESSIBILITY: { table: "tipos_accesibilidad" },
  ACTIVITY: { table: "actividades_turisticas" },
  FACILITY: { table: "tipos_facilidad" },
};

type CenterDraft = {
  name: string;
  subtypeId: number;
  touristZoneId: number;
  parishId: number;
  productLineId: number;
  scenarioId: number;
  hierarchyId: number;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  description?: string;
  address?: {
    barrio?: string;
    street?: string;
    number?: string;
    crossStreet?: string;
  };
  administration?: AdminAdministrationDto;
  climate?: AdminClimateDto;
  admission?: AdminAdmissionDto;
  activities?: AdminActivityDto[];
  accessibility?: AdminAccessibilityDto[];
  facilities?: AdminFacilityDto[];
  sections?: Record<string, unknown>;
};

interface CenterRow extends JsonRecord {
  id: string;
  code: string | null;
  name: string;
  statusCode: string;
  statusName: string;
  active: boolean;
  publishedAt: string | null;
  subtypeId: number;
  touristZoneId: number;
  parishId: number;
  productLineId: number;
  scenarioId: number;
  hierarchyId: number | null;
  latitude: string;
  longitude: string;
  altitudeMeters: number | null;
  description: string | null;
  barrio: string | null;
  street: string | null;
  addressNumber: string | null;
  crossStreet: string | null;
  administration: AdminAdministrationDto | null;
  climate: AdminClimateDto | null;
  admission: AdminAdmissionDto | null;
  activities: AdminActivityDto[];
  accessibility: AdminAccessibilityDto[];
  facilities: AdminFacilityDto[];
}

interface DraftRow {
  id: string;
  stateCode: string;
  stateName: string;
  version: number;
  data: CenterDraft;
}

interface RevisionRow {
  id: string;
  stateCode: string;
  stateName: string;
  observation: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  data: CenterDraft;
}

interface CenterListRow {
  code: string;
  name: string;
  statusCode: string;
  statusName: string;
  baseStatusCode: string;
  updatedAt: string;
  submittedAt: string | null;
  requestedBy: string | null;
  observation: string | null;
  active: boolean;
  hasDraft: boolean;
  total: string;
}

const EDITABLE_DRAFT_STATES = new Set(["BORRADOR", "RECHAZADO"]);
const SECTION_RESPONSE_VALUES = new Set([
  "SI",
  "NO",
  "SIN_INFORMACION",
  "NO_APLICA",
]);

/**
 * Validates the transitional JSON contract used by the web section editor.
 * Legacy section payloads without the new fields remain readable while the
 * normalized publication adapters are being implemented.
 */
export function validateAdminSectionContent(content: unknown): string | null {
  if (!isJsonRecord(content))
    return "El contenido de la sección debe ser un objeto.";
  const usesStructuredContract = [
    "schemaVersion",
    "response",
    "observation",
    "rows",
  ].some((key) => key in content);
  if (!usesStructuredContract) return null;
  if (content.schemaVersion !== undefined && content.schemaVersion !== 1) {
    return "La versión de la sección no es compatible.";
  }
  if (!("response" in content) || !isSectionResponse(content.response)) {
    return "La sección requiere una respuesta válida.";
  }
  if (
    content.observation !== undefined &&
    content.observation !== null &&
    (typeof content.observation !== "string" ||
      content.observation.length > 2_000)
  ) {
    return "La observación de la sección supera el límite permitido.";
  }
  if (
    content.localityId !== undefined &&
    content.localityId !== null &&
    (!Number.isInteger(content.localityId) || Number(content.localityId) < 1)
  ) {
    return "La localidad cercana no es válida.";
  }
  if (
    content.distanceKm !== undefined &&
    content.distanceKm !== null &&
    (typeof content.distanceKm !== "number" ||
      !Number.isFinite(content.distanceKm) ||
      content.distanceKm < 0)
  ) {
    return "La distancia debe ser un número mayor o igual que cero.";
  }
  if (content.rows !== undefined) {
    if (!Array.isArray(content.rows) || content.rows.length > 200) {
      return "Las filas de la sección no son válidas.";
    }
    for (const row of content.rows) {
      if (!isJsonRecord(row)) return "Una fila de la sección no es válida.";
      if (
        typeof row.label !== "string" ||
        row.label.trim().length === 0 ||
        row.label.length > 180
      ) {
        return "Cada fila debe tener un elemento de hasta 180 caracteres.";
      }
      if (!isSectionResponse(row.response)) {
        return "Cada fila requiere una respuesta válida.";
      }
      if (
        row.quantity !== undefined &&
        row.quantity !== null &&
        (!Number.isInteger(row.quantity) || Number(row.quantity) < 0)
      ) {
        return "Las cantidades deben ser enteros mayores o iguales que cero.";
      }
      if (
        row.observation !== undefined &&
        row.observation !== null &&
        (typeof row.observation !== "string" || row.observation.length > 1_000)
      ) {
        return "La observación de una fila supera el límite permitido.";
      }
    }
  }
  return null;
}

export function getAdminSectionProgress(
  content: unknown,
  coreComplete = false,
): AdminCenterSectionProgressStatus {
  if (content === undefined || content === null) {
    return coreComplete ? "COMPLETA" : "SIN_INICIAR";
  }
  if (!isJsonRecord(content)) return "CON_ERRORES";
  const validationError = validateAdminSectionContent(content);
  if (validationError) return "CON_ERRORES";
  if (!("response" in content)) return "INCOMPLETA";
  return content.response === "NO_APLICA" ? "NO_APLICA" : "COMPLETA";
}

function isSectionResponse(value: unknown): boolean {
  return typeof value === "string" && SECTION_RESPONSE_VALUES.has(value);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildAdminSectionProgress(
  draft?: CenterDraft,
): AdminCenterSectionProgress[] {
  const sections = draft?.sections ?? {};
  const core = getCoreSectionCompletion(draft);
  return ADMIN_CENTER_SECTION_CODES.map((code) => ({
    code,
    status: getAdminSectionProgress(sections[code], core[code] ?? false),
  }));
}

function getCoreSectionCompletion(
  draft?: CenterDraft,
): Partial<Record<AdminCenterSectionCode, boolean>> {
  if (!draft) return {};
  return {
    identificacion: Boolean(
      draft.name &&
      draft.subtypeId &&
      draft.touristZoneId &&
      draft.parishId &&
      draft.productLineId &&
      draft.scenarioId,
    ),
    "ubicacion-admin":
      Number.isFinite(draft.latitude) && Number.isFinite(draft.longitude),
    caracteristicas: Boolean(draft.productLineId && draft.scenarioId),
    accesibilidad: Array.isArray(draft.accessibility),
    planta: Array.isArray(draft.facilities),
    actividades: Array.isArray(draft.activities),
    descripcion: Boolean(draft.description?.trim()),
  };
}

@Injectable()
export class AdminCentersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() @Inject(MediaService) private readonly media?: MediaService,
  ) {}

  async list(query: AdminCentersQueryDto) {
    const values: unknown[] = [];
    const conditions: string[] = ["TRUE"];
    if (query.status) {
      values.push(query.status);
      conditions.push(`inventory.status_code = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      conditions.push(
        `(inventory.name ILIKE $${values.length} OR inventory.code ILIKE $${values.length})`,
      );
    }
    const limitIndex = values.push(query.limit);
    const offsetIndex = values.push(query.offset);
    const rows = (await this.dataSource.query(
      `WITH inventory AS (
         SELECT TRIM(c.codigo_atractivo) AS code,
                c.nombre AS name,
                CASE
                  WHEN c.activo = FALSE THEN 'INACTIVO'
                  WHEN bd.state_code IS NOT NULL AND bd.state_code <> 'PUBLICADO' THEN bd.state_code
                  ELSE er.codigo
                END AS status_code,
                CASE
                  WHEN c.activo = FALSE THEN 'Inactivo'
                  WHEN bd.state_name IS NOT NULL AND bd.state_code <> 'PUBLICADO' THEN bd.state_name
                  ELSE er.nombre
                END AS status_name,
                er.codigo AS base_status_code,
                c.updated_at AS "updatedAt",
                rp.fecha_solicitud AS "submittedAt",
                u.nombre AS "requestedBy",
                COALESCE(rp.observacion, bd.observation) AS observation,
                c.activo AS active,
                (bd.id IS NOT NULL AND bd.state_code <> 'PUBLICADO') AS "hasDraft",
                COUNT(*) OVER() AS total
           FROM centros_turisticos c
           JOIN estados_resenia er ON er.id = c.estado_resenia_id
           LEFT JOIN LATERAL (
             SELECT b.id, eb.codigo AS state_code, eb.nombre AS state_name,
                    rp0.observacion AS observation
               FROM borradores_centros_turisticos b
               JOIN estados_resenia eb ON eb.id = b.estado_resenia_id
               LEFT JOIN LATERAL (
                 SELECT r.observacion
                   FROM revisiones_publicacion r
                  WHERE r.centro_turistico_id = c.id
                  ORDER BY r.fecha_solicitud DESC
                  LIMIT 1
               ) rp0 ON TRUE
              WHERE b.centro_turistico_id = c.id
              LIMIT 1
           ) bd ON TRUE
           LEFT JOIN LATERAL (
             SELECT r.fecha_solicitud, r.observacion, r.solicitado_por
               FROM revisiones_publicacion r
              WHERE r.centro_turistico_id = c.id
              ORDER BY r.fecha_solicitud DESC
              LIMIT 1
           ) rp ON TRUE
           LEFT JOIN usuarios u ON u.id = rp.solicitado_por
       )
       SELECT code, name, status_code AS "statusCode", status_name AS "statusName",
              base_status_code AS "baseStatusCode", "updatedAt", "submittedAt",
              "requestedBy", observation, active, "hasDraft", total
         FROM inventory
        WHERE ${conditions.join(" AND ")}
        ORDER BY "updatedAt" DESC, code ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values,
    )) as CenterListRow[];

    return {
      items: rows.map((row) => ({
        code: row.code,
        name: row.name,
        status: { code: row.statusCode, name: row.statusName },
        baseStatus: row.baseStatusCode,
        updatedAt: row.updatedAt,
        submittedAt: row.submittedAt,
        requestedBy: row.requestedBy,
        observation: row.observation,
        active: row.active,
        hasDraft: row.hasDraft,
      })),
      total: Number(rows[0]?.total ?? 0),
      limit: Number(query.limit),
      offset: Number(query.offset),
    };
  }

  async summary() {
    const rows = (await this.dataSource.query(
      `WITH inventory AS (
         SELECT CASE
                  WHEN c.activo = FALSE THEN 'INACTIVO'
                  WHEN bstate.codigo IS NOT NULL AND bstate.codigo <> 'PUBLICADO' THEN bstate.codigo
                  ELSE er.codigo
                END AS code,
                CASE
                  WHEN c.activo = FALSE THEN 'Inactivo'
                  WHEN bstate.nombre IS NOT NULL AND bstate.codigo <> 'PUBLICADO' THEN bstate.nombre
                  ELSE er.nombre
                END AS name,
                c.activo AS active
           FROM centros_turisticos c
           JOIN estados_resenia er ON er.id = c.estado_resenia_id
           LEFT JOIN borradores_centros_turisticos b ON b.centro_turistico_id = c.id
           LEFT JOIN estados_resenia bstate ON bstate.id = b.estado_resenia_id
       )
       SELECT code, name, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE active = TRUE)::int AS active
         FROM inventory
        GROUP BY code, name
        ORDER BY code`,
    )) as { code: string; name: string; total: number; active: number }[];

    const byStatus = rows.map((row) => ({
      code: row.code,
      name: row.name,
      total: Number(row.total),
      active: Number(row.active),
    }));
    const total = byStatus.reduce((sum, row) => sum + row.total, 0);
    const active = byStatus.reduce((sum, row) => sum + row.active, 0);
    const count = (code: string) =>
      byStatus.find((row) => row.code === code)?.total ?? 0;

    return {
      total,
      active,
      pendingReview: count("EN_REVISION"),
      published: count("PUBLICADO"),
      inactive: Math.max(total - active, 0),
      byStatus,
    };
  }

  async catalogs(query: AdminCatalogsQueryDto = {}) {
    const search = query.q?.trim() || null;
    const like = search ? `%${search}%` : null;
    const activeCondition = query.includeInactive ? "TRUE" : "activo = TRUE";
    const [
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      localities,
      zones,
      lines,
      scenarios,
      hierarchies,
      climates,
      incomeTypes,
      attentionModes,
      accessibilityTypes,
      activityGroups,
      activities,
      facilityCategories,
      facilities,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM categorias_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, categoria_id AS "categoryId" FROM tipos_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, tipo_atractivo_id AS "typeId" FROM subtipos_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_dpa AS code, nombre AS name FROM provincias WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_cton AS code, nombre AS name, provincia_id AS "provinceId" FROM cantones WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_pqa AS code, nombre AS name, canton_id AS "cantonId" FROM parroquias WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT l.id, l.nombre AS name, l.tipo_localidad AS "localityType",
                l.canton_id AS "cantonId", co.provincia_id AS "provinceId"
           FROM localidades l
           JOIN cantones co ON co.id = l.canton_id
          WHERE l.activo AND ($1::text IS NULL OR l.nombre ILIKE $1)
          ORDER BY l.nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, nombre AS name, localidad_id AS "localityId" FROM zonas_turisticas WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM lineas_producto WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM escenarios WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM rangos_jerarquia WHERE activo ORDER BY codigo`,
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM catalogo_clima WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM tipos_ingreso WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM modalidades_atencion WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active FROM tipos_accesibilidad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active, categoria_atractivo_id AS "categoryId" FROM grupos_actividad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT at.id, at.codigo AS code, at.nombre AS name, at.activo AS active,
                at.grupo_actividad_id AS "groupId", ga.categoria_atractivo_id AS "categoryId"
           FROM actividades_turisticas at
           JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
           WHERE ${query.includeInactive ? "TRUE" : "at.activo = TRUE AND ga.activo = TRUE"} AND ($1::text IS NULL OR at.nombre ILIKE $1)
          ORDER BY ga.nombre, at.nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active FROM categorias_facilidad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT tf.id, tf.codigo AS code, tf.nombre AS name, tf.activo AS active,
                tf.categoria_facilidad_id AS "categoryId"
           FROM tipos_facilidad tf
           JOIN categorias_facilidad cf ON cf.id = tf.categoria_facilidad_id
          WHERE ${query.includeInactive ? "TRUE" : "tf.activo = TRUE AND cf.activo = TRUE"} AND ($1::text IS NULL OR tf.nombre ILIKE $1)
          ORDER BY cf.nombre, tf.nombre`,
        [like],
      ),
    ]);
    return {
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      localities,
      zones,
      lines,
      scenarios,
      hierarchies,
      climates,
      incomeTypes,
      attentionModes,
      accessibilityTypes,
      activityGroups,
      activities,
      facilityCategories,
      facilities,
    };
  }

  async updateCatalog(
    actorId: number,
    catalog: string,
    id: number,
    input: AdminCatalogUpdateDto,
  ) {
    const target = CATALOG_TARGETS[catalog as CatalogKey];
    if (!target) throw new ConflictException("El catálogo no está disponible.");
    if (input.name === undefined && input.active === undefined) {
      throw new ConflictException("Debes indicar un cambio para el catálogo.");
    }
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM ${target.table} WHERE id = $1 FOR UPDATE`,
        [id],
      )) as Array<{ id: string; code: string; name: string; active: boolean }>;
      const current = rows[0];
      if (!current)
        throw new NotFoundException("No se encontró la opción del catálogo.");
      const nextName = input.name?.trim() || current.name;
      const nextActive = input.active ?? current.active;
      if (nextName === current.name && nextActive === current.active) {
        return {
          catalog,
          id: Number(current.id),
          code: current.code,
          name: current.name,
          active: current.active,
        };
      }
      const duplicate = await manager.query(
        `SELECT 1 FROM ${target.table}
          WHERE lower(nombre) = lower($1) AND id <> $2
          LIMIT 1`,
        [nextName, id],
      );
      if (duplicate[0]) {
        throw new ConflictException("Ya existe otra opción con ese nombre.");
      }
      await manager.query(
        `UPDATE ${target.table}
            SET nombre = $2, activo = $3
          WHERE id = $1
          RETURNING id, codigo AS code, nombre AS name, activo AS active`,
        [id, nextName, nextActive],
      );
      await manager.query(
        `INSERT INTO auditoria_catalogos
          (usuario_id, catalogo_codigo, registro_id, accion, datos_anteriores, datos_nuevos)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
        [
          actorId,
          catalog,
          id,
          nextActive === current.active
            ? "MODIFICAR"
            : nextActive
              ? "ACTIVAR"
              : "DESACTIVAR",
          JSON.stringify({ name: current.name, active: current.active }),
          JSON.stringify({ name: nextName, active: nextActive }),
        ],
      );
      return {
        catalog,
        id,
        code: current.code,
        name: nextName,
        active: nextActive,
      };
    });
  }

  async find(code: string) {
    return this.dataSource.transaction((manager) =>
      this.findByCode(manager, code),
    );
  }

  async create(actorId: number, input: SaveAdminCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const draft = this.requireComplete(
        await this.ensureProvisionalHierarchy(manager, {
          ...input,
          hierarchyId: undefined,
        }),
      );
      await this.validateReferences(manager, draft);
      const state = await this.stateId(manager, "BORRADOR");
      const sequence = await this.nextSequence(manager, draft.parishId);
      const rows = (await manager.query(
        `INSERT INTO centros_turisticos
          (secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id,
           parroquia_id, linea_producto_id, escenario_id, jerarquia_id,
           estado_resenia_id, latitud, longitud, altitud_msnm, descripcion,
           barrio_sector_comuna, calle_principal, numero_direccion, calle_transversal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          sequence,
          draft.name,
          draft.subtypeId,
          draft.touristZoneId,
          draft.parishId,
          draft.productLineId,
          draft.scenarioId,
          draft.hierarchyId,
          state.id,
          draft.latitude,
          draft.longitude,
          draft.altitudeMeters ?? null,
          draft.description ?? null,
          draft.address?.barrio ?? null,
          draft.address?.street ?? null,
          draft.address?.number ?? null,
          draft.address?.crossStreet ?? null,
        ],
      )) as { id: string }[];
      const center = rows[0];
      if (!center) throw new ConflictException("No se pudo crear la ficha.");
      await this.upsertDraft(manager, center.id, state.id, 1, draft, actorId);
      await this.audit(manager, center.id, actorId, "CREAR", null, draft);
      return this.findById(manager, center.id);
    });
  }

  async save(code: string, actorId: number, input: SaveAdminCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const currentDraft = await this.getDraft(manager, center.id);
      const base =
        currentDraft && currentDraft.stateCode !== "PUBLICADO"
          ? currentDraft.data
          : {
              ...this.centerToDraft(center),
              sections: currentDraft?.data.sections,
            };
      const draftState = currentDraft?.stateCode ?? center.statusCode;
      if (
        !EDITABLE_DRAFT_STATES.has(draftState) &&
        draftState !== "PUBLICADO"
      ) {
        throw new ConflictException(
          "La ficha no se puede editar mientras está en revisión o aprobada.",
        );
      }
      if (
        input.version !== undefined &&
        currentDraft &&
        input.version !== currentDraft.version
      ) {
        throw new ConflictException(
          "La ficha cambió mientras la editabas. Recarga antes de guardar.",
        );
      }
      const next = mergeDraft(base, input);
      if (
        input.hierarchyId !== undefined &&
        Number(base.hierarchyId) !== Number(input.hierarchyId)
      ) {
        throw new ConflictException(
          "La jerarquía se calcula a partir de la valoración y no se puede editar.",
        );
      }
      const normalized = next.hierarchyId
        ? next
        : this.requireComplete(
            await this.ensureProvisionalHierarchy(manager, next),
          );
      await this.validateReferences(manager, normalized);
      const state = await this.stateId(manager, "BORRADOR");
      const nextVersion = (currentDraft?.version ?? 0) + 1;
      await this.upsertDraft(
        manager,
        center.id,
        state.id,
        nextVersion,
        normalized,
        actorId,
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "MODIFICAR",
        base,
        normalized,
      );
      return this.findById(manager, center.id);
    });
  }

  async submitReview(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const draft = await this.getDraft(manager, center.id);
      if (!draft || !EDITABLE_DRAFT_STATES.has(draft.stateCode)) {
        throw new ConflictException(
          "No existe un borrador editable para enviar a revisión.",
        );
      }
      const complete = this.requireComplete(
        await this.ensureProvisionalHierarchy(manager, draft.data),
      );
      await this.validateReferences(manager, complete);
      const state = await this.stateId(manager, "EN_REVISION");
      await manager.query(
        `UPDATE borradores_centros_turisticos
            SET estado_resenia_id = $2, version = version + 1,
                datos = $4::jsonb, actualizado_por = $3
          WHERE centro_turistico_id = $1`,
        [center.id, state.id, actorId, JSON.stringify(complete)],
      );
      if (center.statusCode !== "PUBLICADO") {
        await this.setCenterState(manager, center.id, "EN_REVISION");
      }
      await manager.query(
        `INSERT INTO revisiones_publicacion
          (centro_turistico_id, solicitado_por, estado_resenia_id, datos_propuestos)
         VALUES ($1,$2,$3,$4::jsonb)`,
        [center.id, actorId, state.id, JSON.stringify(complete)],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "SOLICITAR_REVISION",
        null,
        complete,
      );
      return this.findById(manager, center.id);
    });
  }

  async review(code: string, actorId: number, input: ReviewCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const revision = await this.latestRevision(
        manager,
        center.id,
        "EN_REVISION",
      );
      const draft = await this.getDraft(manager, center.id);
      if (!revision || !draft) {
        throw new ConflictException(
          "La ficha ya no está en revisión; actualiza la lista antes de operar.",
        );
      }
      const targetCode = input.action === "APPROVE" ? "APROBADO" : "RECHAZADO";
      const target = await this.stateId(manager, targetCode);
      await manager.query(
        `UPDATE revisiones_publicacion
            SET revisado_por = $2, estado_resenia_id = $3,
                observacion = $4, fecha_revision = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [revision.id, actorId, target.id, input.observation ?? null],
      );
      await manager.query(
        `UPDATE borradores_centros_turisticos
            SET estado_resenia_id = $2, version = version + 1, actualizado_por = $3
          WHERE centro_turistico_id = $1`,
        [center.id, target.id, actorId],
      );
      if (center.statusCode !== "PUBLICADO") {
        await this.setCenterState(manager, center.id, targetCode);
      }
      await this.audit(
        manager,
        center.id,
        actorId,
        input.action === "APPROVE" ? "APROBAR" : "RECHAZAR",
        { estado: "EN_REVISION" },
        { estado: targetCode, observacion: input.observation ?? null },
      );
      return this.findById(manager, center.id);
    });
  }

  async publish(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const draft = await this.getDraft(manager, center.id);
      if (!draft || draft.stateCode !== "APROBADO") {
        throw new ConflictException(
          "Solo se pueden publicar fichas aprobadas.",
        );
      }
      const complete = this.requireComplete(draft.data);
      await this.validateReferences(manager, complete);
      await this.applyDraft(manager, center, complete);
      const published = await this.stateId(manager, "PUBLICADO");
      await manager.query(
        `UPDATE borradores_centros_turisticos SET estado_resenia_id = $2, version = version + 1, actualizado_por = $3 WHERE centro_turistico_id = $1`,
        [center.id, published.id, actorId],
      );
      await manager.query(
        `UPDATE revisiones_publicacion
            SET revisado_por = $2, estado_resenia_id = $3,
                fecha_revision = COALESCE(fecha_revision, CURRENT_TIMESTAMP)
          WHERE id = (
            SELECT id FROM revisiones_publicacion
             WHERE centro_turistico_id = $1
             ORDER BY fecha_solicitud DESC LIMIT 1
          )`,
        [center.id, actorId, published.id],
      );
      await this.media?.publishPending(manager, center.id, actorId);
      await this.audit(
        manager,
        center.id,
        actorId,
        "PUBLICAR",
        { estado: center.statusCode },
        { estado: "PUBLICADO" },
      );
      return this.findById(manager, center.id);
    });
  }

  async deactivate(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const inactive = await this.stateId(manager, "INACTIVO");
      await manager.query(
        `UPDATE centros_turisticos SET activo = FALSE, estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [center.id, inactive.id],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "DESACTIVAR",
        { estado: center.statusCode },
        { estado: "INACTIVO" },
      );
      return this.findById(manager, center.id);
    });
  }

  async reactivate(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const targetCode = center.publishedAt ? "PUBLICADO" : "BORRADOR";
      const target = await this.stateId(manager, targetCode);
      await manager.query(
        `UPDATE centros_turisticos SET activo = TRUE, estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [center.id, target.id],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "REACTIVAR",
        { estado: "INACTIVO" },
        { estado: targetCode },
      );
      return this.findById(manager, center.id);
    });
  }

  async getAudit(code: string) {
    const rows = await this.dataSource.query(
      `SELECT a.accion AS action, a.seccion_codigo AS section,
              a.datos_anteriores AS "previous", a.datos_nuevos AS "next",
              a.created_at AS "createdAt", u.nombre AS actor
         FROM auditoria_fichas a
         JOIN centros_turisticos c ON c.id = a.centro_turistico_id
         JOIN usuarios u ON u.id = a.usuario_id
        WHERE TRIM(c.codigo_atractivo) = TRIM($1)
        ORDER BY a.created_at DESC, a.id DESC`,
      [code],
    );
    return { items: rows };
  }

  async sections(code: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        this.centerSelect() + " WHERE TRIM(c.codigo_atractivo) = TRIM($1)",
        [code],
      )) as CenterRow[];
      const center = rows[0];
      if (!center)
        throw new NotFoundException("No se encontró la ficha turística.");
      const draft = await this.getDraft(manager, center.id);
      return {
        code: center.code ?? code,
        version: draft?.version ?? 0,
        sections: draft?.data.sections ?? {},
        progress: buildAdminSectionProgress(draft?.data),
      };
    });
  }

  async saveSection(
    code: string,
    sectionCode: AdminCenterSectionCode,
    actorId: number,
    input: SaveAdminSectionDto,
  ) {
    if (!ADMIN_CENTER_SECTION_CODES.includes(sectionCode)) {
      throw new ConflictException("La sección de ficha no está disponible.");
    }
    const serialized = JSON.stringify(input.content);
    if (serialized.length > 300_000) {
      throw new ConflictException("La sección supera el tamaño permitido.");
    }
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const currentDraft = await this.getDraft(manager, center.id);
      const base =
        currentDraft && currentDraft.stateCode !== "PUBLICADO"
          ? currentDraft.data
          : {
              ...this.centerToDraft(center),
              sections: currentDraft?.data.sections,
            };
      const draftState = currentDraft?.stateCode ?? center.statusCode;
      if (
        !EDITABLE_DRAFT_STATES.has(draftState) &&
        draftState !== "PUBLICADO"
      ) {
        throw new ConflictException(
          "La ficha no se puede editar mientras está en revisión o aprobada.",
        );
      }
      if (
        input.version !== undefined &&
        currentDraft &&
        input.version !== currentDraft.version
      ) {
        throw new ConflictException(
          "La ficha cambió mientras la editabas. Recarga antes de guardar.",
        );
      }
      const next: CenterDraft = {
        ...base,
        sections: {
          ...(base.sections ?? {}),
          [sectionCode]: input.content,
        },
      };
      this.validateSectionMap(next.sections);
      await this.validateReferences(manager, next);
      const state = await this.stateId(manager, "BORRADOR");
      const nextVersion = (currentDraft?.version ?? 0) + 1;
      await this.upsertDraft(
        manager,
        center.id,
        state.id,
        nextVersion,
        next,
        actorId,
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "MODIFICAR",
        base,
        next,
        sectionCode,
      );
      return this.findById(manager, center.id);
    });
  }

  private async findByCode(manager: EntityManager, code: string) {
    const rows = (await manager.query(
      this.centerSelect() + " WHERE TRIM(c.codigo_atractivo) = TRIM($1)",
      [code],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return this.mapDetail(manager, rows[0]);
  }

  private async findById(manager: EntityManager, id: string) {
    const rows = (await manager.query(
      this.centerSelect() + " WHERE c.id = $1",
      [id],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return this.mapDetail(manager, rows[0]);
  }

  private async mapDetail(manager: EntityManager, center: CenterRow) {
    const draft = await this.getDraft(manager, center.id);
    const revision = await this.latestRevision(manager, center.id);
    const hasPendingDraft = draft && draft.stateCode !== "PUBLICADO";
    const effectiveStatus =
      center.active === false
        ? { code: "INACTIVO", name: "Inactivo" }
        : hasPendingDraft
          ? { code: draft.stateCode, name: draft.stateName }
          : { code: center.statusCode, name: center.statusName };
    return {
      code: center.code,
      status: effectiveStatus,
      baseStatus: { code: center.statusCode, name: center.statusName },
      active: center.active,
      publishedAt: center.publishedAt ?? null,
      version: draft?.version ?? 0,
      published: this.centerToDraft(center),
      draft: hasPendingDraft ? draft.data : null,
      review: revision
        ? {
            status: { code: revision.stateCode, name: revision.stateName },
            observation: revision.observation,
            requestedAt: revision.requestedAt,
            reviewedAt: revision.reviewedAt,
          }
        : null,
    };
  }

  private centerSelect(): string {
    return `SELECT c.id, TRIM(c.codigo_atractivo) AS code, c.nombre AS name,
                   er.codigo AS "statusCode", er.nombre AS "statusName", c.activo AS active,
                   c.publicado_at AS "publishedAt", c.subtipo_atractivo_id AS "subtypeId",
                   c.zona_turistica_id AS "touristZoneId", c.parroquia_id AS "parishId",
                   c.linea_producto_id AS "productLineId", c.escenario_id AS "scenarioId",
                   c.jerarquia_id AS "hierarchyId", c.latitud AS latitude, c.longitud AS longitude,
                   c.altitud_msnm AS "altitudeMeters", c.descripcion AS description,
                   c.barrio_sector_comuna AS barrio, c.calle_principal AS street,
                   c.numero_direccion AS "addressNumber", c.calle_transversal AS "crossStreet",
                   CASE WHEN aa.id IS NULL THEN NULL ELSE json_build_object(
                     'type', aa.tipo_administrador, 'institution', aa.institucion,
                     'name', aa.nombre_administrador, 'position', aa.cargo,
                     'phone', aa.num_celular, 'email', aa.email, 'observation', aa.observacion) END AS administration,
                   CASE WHEN cc.id IS NULL THEN NULL ELSE json_build_object(
                     'climateId', cc.tipo_clima_id, 'minTemperature', cc.temperatura_min_c,
                     'maxTemperature', cc.temperatura_max_c, 'minRainfall', cc.precipitacion_min_mm,
                     'maxRainfall', cc.precipitacion_max_mm, 'observation', cc.observacion) END AS climate,
                   CASE WHEN ic.id IS NULL THEN NULL ELSE json_build_object(
                     'incomeTypeId', ic.tipo_ingreso_id, 'attentionModeId', ic.modalidad_atencion_id,
                     'opensAt', to_char(ic.hora_ingreso, 'HH24:MI'), 'closesAt', to_char(ic.hora_salida, 'HH24:MI'),
                     'otherAttention', ic.atencion_otro, 'reservations', ic.maneja_reservas,
                     'priceFrom', ic.precio_desde, 'priceTo', ic.precio_hasta, 'observation', ic.observacion) END AS admission,
                   COALESCE((SELECT json_agg(json_build_object(
                     'activityId', act.actividad_turistica_id, 'active', act.activo,
                     'detailOther', act.detalle_otro, 'observation', act.observacion)
                     ORDER BY act.actividad_turistica_id)
                     FROM actividades_centro_turistico act
                    WHERE act.centro_turistico_id = c.id), '[]'::json) AS activities,
                   COALESCE((SELECT json_agg(json_build_object(
                     'typeId', acr.tipo_accesibilidad_id, 'applies', acr.aplica,
                     'observation', acr.observacion)
                     ORDER BY acr.tipo_accesibilidad_id)
                     FROM centro_accesibilidad_resumen acr
                    WHERE acr.centro_turistico_id = c.id), '[]'::json) AS accessibility,
                   COALESCE((SELECT json_agg(json_build_object(
                     'typeId', fc.tipo_facilidad_id, 'quantity', fc.cantidad,
                     'detailOther', fc.detalle_otro, 'observation', fc.observacion)
                     ORDER BY fc.tipo_facilidad_id)
                     FROM facilidades_centro fc
                    WHERE fc.centro_turistico_id = c.id), '[]'::json) AS facilities
              FROM centros_turisticos c
              JOIN estados_resenia er ON er.id = c.estado_resenia_id
              LEFT JOIN administraciones_atractivo aa ON aa.centro_turistico_id = c.id
              LEFT JOIN caracteristicas_climaticas cc ON cc.centro_turistico_id = c.id
              LEFT JOIN ingresos_centro_turistico ic ON ic.centro_turistico_id = c.id`;
  }

  private async lockCenter(
    manager: EntityManager,
    code: string,
  ): Promise<CenterRow> {
    const rows = (await manager.query(
      this.centerSelect() +
        " WHERE TRIM(c.codigo_atractivo) = TRIM($1) FOR UPDATE OF c",
      [code],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return rows[0];
  }

  private async getDraft(
    manager: EntityManager,
    centerId: string,
  ): Promise<DraftRow | null> {
    const rows = (await manager.query(
      `SELECT b.id, e.codigo AS "stateCode", e.nombre AS "stateName", b.version, b.datos AS data
         FROM borradores_centros_turisticos b
         JOIN estados_resenia e ON e.id = b.estado_resenia_id
        WHERE b.centro_turistico_id = $1`,
      [centerId],
    )) as DraftRow[];
    return rows[0] ?? null;
  }

  private async latestRevision(
    manager: EntityManager,
    centerId: string,
    state?: string,
  ): Promise<RevisionRow | null> {
    const params: unknown[] = [centerId];
    const stateCondition = state ? "AND e.codigo = $2" : "";
    if (state) params.push(state);
    const rows = (await manager.query(
      `SELECT r.id, e.codigo AS "stateCode", e.nombre AS "stateName",
              r.observacion AS observation, r.fecha_solicitud AS "requestedAt",
              r.fecha_revision AS "reviewedAt", r.datos_propuestos AS data
         FROM revisiones_publicacion r
         JOIN estados_resenia e ON e.id = r.estado_resenia_id
        WHERE r.centro_turistico_id = $1 ${stateCondition}
        ORDER BY r.fecha_solicitud DESC, r.id DESC LIMIT 1`,
      params,
    )) as RevisionRow[];
    return rows[0] ?? null;
  }

  private async upsertDraft(
    manager: EntityManager,
    centerId: string,
    stateId: string,
    version: number,
    data: CenterDraft,
    actorId: number,
  ) {
    await manager.query(
      `INSERT INTO borradores_centros_turisticos
        (centro_turistico_id, estado_resenia_id, version, datos, actualizado_por)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (centro_turistico_id) DO UPDATE SET
         estado_resenia_id = EXCLUDED.estado_resenia_id,
         version = EXCLUDED.version,
         datos = EXCLUDED.datos,
         actualizado_por = EXCLUDED.actualizado_por,
         updated_at = CURRENT_TIMESTAMP`,
      [centerId, stateId, version, JSON.stringify(data), actorId],
    );
  }

  private async applyDraft(
    manager: EntityManager,
    center: CenterRow,
    draft: CenterDraft,
  ) {
    let sequence: number | null = null;
    if (Number(center.parishId) !== Number(draft.parishId)) {
      sequence = await this.nextSequence(manager, draft.parishId);
    }
    const published = await this.stateId(manager, "PUBLICADO");
    await manager.query(
      `UPDATE centros_turisticos
          SET secuencial_atractivo = COALESCE($2, secuencial_atractivo),
              nombre = $3, subtipo_atractivo_id = $4, zona_turistica_id = $5,
              parroquia_id = $6, linea_producto_id = $7, escenario_id = $8,
              jerarquia_id = $9, estado_resenia_id = $10, latitud = $11,
              longitud = $12, altitud_msnm = $13, descripcion = $14,
              barrio_sector_comuna = $15, calle_principal = $16,
              numero_direccion = $17, calle_transversal = $18,
              activo = TRUE, publicado_at = COALESCE(publicado_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [
        center.id,
        sequence,
        draft.name,
        draft.subtypeId,
        draft.touristZoneId,
        draft.parishId,
        draft.productLineId,
        draft.scenarioId,
        draft.hierarchyId,
        published.id,
        draft.latitude,
        draft.longitude,
        draft.altitudeMeters ?? null,
        draft.description ?? null,
        draft.address?.barrio ?? null,
        draft.address?.street ?? null,
        draft.address?.number ?? null,
        draft.address?.crossStreet ?? null,
      ],
    );
    if (draft.administration) {
      await manager.query(
        `INSERT INTO administraciones_atractivo
          (centro_turistico_id, tipo_administrador, institucion, nombre_administrador, cargo, num_celular, email, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_administrador = EXCLUDED.tipo_administrador, institucion = EXCLUDED.institucion,
          nombre_administrador = EXCLUDED.nombre_administrador, cargo = EXCLUDED.cargo,
          num_celular = EXCLUDED.num_celular, email = EXCLUDED.email, observacion = EXCLUDED.observacion,
          updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.administration.type,
          draft.administration.institution ?? null,
          draft.administration.name,
          draft.administration.position ?? null,
          draft.administration.phone ?? null,
          draft.administration.email ?? null,
          draft.administration.observation ?? null,
        ],
      );
    }
    if (draft.climate) {
      await manager.query(
        `INSERT INTO caracteristicas_climaticas
          (centro_turistico_id, tipo_clima_id, temperatura_min_c, temperatura_max_c, precipitacion_min_mm, precipitacion_max_mm, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_clima_id = EXCLUDED.tipo_clima_id, temperatura_min_c = EXCLUDED.temperatura_min_c,
          temperatura_max_c = EXCLUDED.temperatura_max_c, precipitacion_min_mm = EXCLUDED.precipitacion_min_mm,
          precipitacion_max_mm = EXCLUDED.precipitacion_max_mm, observacion = EXCLUDED.observacion,
          updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.climate.climateId,
          draft.climate.minTemperature ?? null,
          draft.climate.maxTemperature ?? null,
          draft.climate.minRainfall ?? null,
          draft.climate.maxRainfall ?? null,
          draft.climate.observation ?? null,
        ],
      );
    }
    if (draft.admission) {
      await manager.query(
        `INSERT INTO ingresos_centro_turistico
          (centro_turistico_id, tipo_ingreso_id, modalidad_atencion_id, hora_ingreso, hora_salida, atencion_otro, maneja_reservas, precio_desde, precio_hasta, observacion)
         VALUES ($1,$2,$3,$4::time,$5::time,$6,$7,$8,$9,$10)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_ingreso_id = EXCLUDED.tipo_ingreso_id, modalidad_atencion_id = EXCLUDED.modalidad_atencion_id,
          hora_ingreso = EXCLUDED.hora_ingreso, hora_salida = EXCLUDED.hora_salida,
          atencion_otro = EXCLUDED.atencion_otro, maneja_reservas = EXCLUDED.maneja_reservas,
          precio_desde = EXCLUDED.precio_desde, precio_hasta = EXCLUDED.precio_hasta,
          observacion = EXCLUDED.observacion, updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.admission.incomeTypeId,
          draft.admission.attentionModeId,
          draft.admission.opensAt ?? null,
          draft.admission.closesAt ?? null,
          draft.admission.otherAttention ?? null,
          draft.admission.reservations ?? false,
          draft.admission.priceFrom ?? null,
          draft.admission.priceTo ?? null,
          draft.admission.observation ?? null,
        ],
      );
    }
    if (draft.activities) {
      await manager.query(
        `UPDATE actividades_centro_turistico SET activo = FALSE WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const activity of draft.activities) {
        await manager.query(
          `INSERT INTO actividades_centro_turistico
             (centro_turistico_id, actividad_turistica_id, activo, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (centro_turistico_id, actividad_turistica_id) DO UPDATE SET
             activo = EXCLUDED.activo, detalle_otro = EXCLUDED.detalle_otro,
             observacion = EXCLUDED.observacion`,
          [
            center.id,
            activity.activityId,
            activity.active,
            activity.detailOther ?? null,
            activity.observation ?? null,
          ],
        );
      }
    }
    if (draft.accessibility) {
      await manager.query(
        `UPDATE centro_accesibilidad_resumen SET aplica = FALSE WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const access of draft.accessibility) {
        await manager.query(
          `INSERT INTO centro_accesibilidad_resumen
             (centro_turistico_id, tipo_accesibilidad_id, aplica, observacion)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (centro_turistico_id, tipo_accesibilidad_id) DO UPDATE SET
             aplica = EXCLUDED.aplica, observacion = EXCLUDED.observacion`,
          [
            center.id,
            access.typeId,
            access.applies,
            access.observation ?? null,
          ],
        );
      }
    }
    if (draft.facilities) {
      await manager.query(
        `DELETE FROM facilidades_centro WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const facility of draft.facilities) {
        await manager.query(
          `INSERT INTO facilidades_centro
             (centro_turistico_id, tipo_facilidad_id, cantidad, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            center.id,
            facility.typeId,
            facility.quantity ?? 1,
            facility.detailOther ?? null,
            facility.observation ?? null,
          ],
        );
      }
    }
  }

  private centerToDraft(center: CenterRow): CenterDraft {
    return {
      name: center.name,
      subtypeId: Number(center.subtypeId),
      touristZoneId: Number(center.touristZoneId),
      parishId: Number(center.parishId),
      productLineId: Number(center.productLineId),
      scenarioId: Number(center.scenarioId),
      hierarchyId: Number(center.hierarchyId),
      latitude: Number(center.latitude),
      longitude: Number(center.longitude),
      altitudeMeters: center.altitudeMeters ?? undefined,
      description: center.description ?? undefined,
      address: {
        barrio: center.barrio ?? undefined,
        street: center.street ?? undefined,
        number: center.addressNumber ?? undefined,
        crossStreet: center.crossStreet ?? undefined,
      },
      administration: center.administration ?? undefined,
      climate: center.climate ?? undefined,
      admission: center.admission ?? undefined,
      activities: normalizeActivities(center.activities),
      accessibility: normalizeAccessibility(center.accessibility),
      facilities: normalizeFacilities(center.facilities),
    };
  }

  private requireComplete(
    value: SaveAdminCenterDto | CenterDraft,
  ): CenterDraft {
    const required = [
      "name",
      "subtypeId",
      "touristZoneId",
      "parishId",
      "productLineId",
      "scenarioId",
      "hierarchyId",
      "latitude",
      "longitude",
    ] as const;
    for (const key of required) {
      const current = value[key];
      if (current === undefined || current === null || current === "") {
        throw new ConflictException(`Falta completar el campo ${key}.`);
      }
    }
    return value as CenterDraft;
  }

  private async ensureProvisionalHierarchy(
    manager: EntityManager,
    value: SaveAdminCenterDto | CenterDraft,
  ): Promise<SaveAdminCenterDto | CenterDraft> {
    if (
      typeof value.hierarchyId === "number" &&
      Number.isInteger(value.hierarchyId) &&
      value.hierarchyId > 0
    ) {
      return value;
    }
    const rows = (await manager.query(
      `SELECT id FROM rangos_jerarquia WHERE codigo = '00' AND activo = TRUE LIMIT 1`,
    )) as Array<{ id: string }>;
    const provisional = rows[0];
    if (!provisional) {
      throw new ConflictException(
        "No está configurada la jerarquía provisional de recurso.",
      );
    }
    return { ...value, hierarchyId: Number(provisional.id) };
  }

  private async validateReferences(manager: EntityManager, draft: CenterDraft) {
    this.validateSectionMap(draft.sections);
    const references: Array<[string, number, string]> = [
      ["subtipos_atractivo", draft.subtypeId, "subtipo"],
      ["zonas_turisticas", draft.touristZoneId, "zona turística"],
      ["parroquias", draft.parishId, "parroquia"],
      ["lineas_producto", draft.productLineId, "línea de producto"],
      ["escenarios", draft.scenarioId, "escenario"],
      ["rangos_jerarquia", draft.hierarchyId, "jerarquía"],
    ];
    for (const [table, id, label] of references) {
      const rows = await manager.query(
        `SELECT 1 FROM ${table} WHERE id = $1 AND activo = TRUE LIMIT 1`,
        [id],
      );
      if (!rows[0])
        throw new ConflictException(
          `La ${label} seleccionada no está disponible.`,
        );
    }
    if (draft.climate)
      await this.ensureReference(
        manager,
        "catalogo_clima",
        draft.climate.climateId,
        "clima",
      );
    if (draft.admission) {
      await this.ensureReference(
        manager,
        "tipos_ingreso",
        draft.admission.incomeTypeId,
        "tipo de ingreso",
      );
      await this.ensureReference(
        manager,
        "modalidades_atencion",
        draft.admission.attentionModeId,
        "modalidad de atención",
      );
    }
    await this.validateTechnicalSections(manager, draft);
  }

  private validateSectionMap(sections: Record<string, unknown> | undefined) {
    if (!sections) return;
    const invalid = Object.keys(sections).filter(
      (key) =>
        !ADMIN_CENTER_SECTION_CODES.includes(
          key as (typeof ADMIN_CENTER_SECTION_CODES)[number],
        ),
    );
    if (invalid.length > 0) {
      throw new ConflictException(
        `La sección de ficha no está disponible: ${invalid[0]}.`,
      );
    }
    for (const [code, content] of Object.entries(sections)) {
      const error = validateAdminSectionContent(content);
      if (error) {
        throw new ConflictException(
          `La sección ${code} no es válida: ${error}`,
        );
      }
    }
    if (JSON.stringify(sections).length > 300_000) {
      throw new ConflictException(
        "El snapshot de secciones supera el tamaño permitido.",
      );
    }
  }

  private async validateTechnicalSections(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const unique = (values: number[], label: string) => {
      if (new Set(values).size !== values.length) {
        throw new ConflictException(`No repitas elementos en ${label}.`);
      }
    };
    if (draft.activities) {
      unique(
        draft.activities.map((item) => item.activityId),
        "actividades",
      );
      const rows = (await manager.query(
        `SELECT at.id
           FROM actividades_turisticas at
           JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
           JOIN subtipos_atractivo sa ON sa.id = $2
           JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
          WHERE at.id = ANY($1::bigint[])
            AND at.activo = TRUE AND ga.activo = TRUE
            AND ga.categoria_atractivo_id = ta.categoria_id`,
        [draft.activities.map((item) => item.activityId), draft.subtypeId],
      )) as { id: string }[];
      if (rows.length !== draft.activities.length) {
        throw new ConflictException(
          "Una actividad no está disponible o no corresponde a la categoría del atractivo.",
        );
      }
    }
    if (draft.accessibility) {
      unique(
        draft.accessibility.map((item) => item.typeId),
        "accesibilidad",
      );
      await this.ensureReferences(
        manager,
        "tipos_accesibilidad",
        draft.accessibility.map((item) => item.typeId),
        "condición de accesibilidad",
      );
    }
    if (draft.facilities) {
      unique(
        draft.facilities.map((item) => item.typeId),
        "facilidades",
      );
      await this.ensureReferences(
        manager,
        "tipos_facilidad",
        draft.facilities.map((item) => item.typeId),
        "facilidad",
      );
    }
  }

  private async ensureReferences(
    manager: EntityManager,
    table: string,
    ids: number[],
    label: string,
  ) {
    if (ids.length === 0) return;
    const rows = await manager.query(
      `SELECT id FROM ${table} WHERE id = ANY($1::bigint[]) AND activo = TRUE`,
      [ids],
    );
    if (rows.length !== ids.length) {
      throw new ConflictException(
        `La ${label} seleccionada no está disponible.`,
      );
    }
  }

  private async ensureReference(
    manager: EntityManager,
    table: string,
    id: number,
    label: string,
  ) {
    const rows = await manager.query(
      `SELECT 1 FROM ${table} WHERE id = $1 AND activo = TRUE LIMIT 1`,
      [id],
    );
    if (!rows[0])
      throw new ConflictException(
        `El ${label} seleccionado no está disponible.`,
      );
  }

  private async nextSequence(
    manager: EntityManager,
    parishId: number,
  ): Promise<number> {
    await manager.query("SELECT id FROM parroquias WHERE id = $1 FOR UPDATE", [
      parishId,
    ]);
    const rows = (await manager.query(
      "SELECT COALESCE(MAX(secuencial_atractivo), 0) + 1 AS next FROM centros_turisticos WHERE parroquia_id = $1",
      [parishId],
    )) as { next: number }[];
    const next = Number(rows[0]?.next ?? 1);
    if (next > 999)
      throw new ConflictException(
        "La parroquia alcanzó el máximo de 999 atractivos.",
      );
    return next;
  }

  private async setCenterState(
    manager: EntityManager,
    centerId: string,
    code: string,
  ) {
    const state = await this.stateId(manager, code);
    await manager.query(
      "UPDATE centros_turisticos SET estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [centerId, state.id],
    );
  }

  private async stateId(
    manager: EntityManager,
    code: string,
  ): Promise<{ id: string; name: string }> {
    const rows = (await manager.query(
      "SELECT id, nombre AS name FROM estados_resenia WHERE codigo = $1 AND activo = TRUE",
      [code],
    )) as { id: string; name: string }[];
    if (!rows[0])
      throw new ConflictException(`El estado ${code} no está configurado.`);
    return rows[0];
  }

  private async audit(
    manager: EntityManager,
    centerId: string,
    actorId: number,
    action: string,
    previous: unknown,
    next: unknown,
    sectionCode?: string,
  ) {
    await manager.query(
      `INSERT INTO auditoria_fichas
        (centro_turistico_id, usuario_id, accion, seccion_codigo, datos_anteriores, datos_nuevos)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
      [
        centerId,
        actorId,
        action,
        sectionCode ?? null,
        previous ? JSON.stringify(previous) : null,
        next ? JSON.stringify(next) : null,
      ],
    );
  }
}

function mergeDraft(base: CenterDraft, input: SaveAdminCenterDto): CenterDraft {
  const {
    address,
    administration,
    climate,
    admission,
    activities,
    accessibility,
    facilities,
  } = input;
  const scalar = Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "version" && value !== undefined,
    ),
  ) as Partial<CenterDraft>;
  return {
    ...base,
    ...defined(scalar),
    ...(address ? { address: { ...base.address, ...defined(address) } } : {}),
    ...(administration
      ? {
          administration: {
            ...base.administration,
            ...defined(administration),
          } as AdminAdministrationDto,
        }
      : {}),
    ...(climate
      ? { climate: { ...base.climate, ...defined(climate) } as AdminClimateDto }
      : {}),
    ...(admission
      ? {
          admission: {
            ...base.admission,
            ...defined(admission),
          } as AdminAdmissionDto,
        }
      : {}),
    ...(activities ? { activities } : {}),
    ...(accessibility ? { accessibility } : {}),
    ...(facilities ? { facilities } : {}),
  };
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, item]) => item !== undefined,
    ),
  ) as Partial<T>;
}

function normalizeActivities(value: unknown): AdminActivityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      activityId: Number(row.activityId),
      active: row.active !== false,
      detailOther:
        typeof row.detailOther === "string" ? row.detailOther : undefined,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}

function normalizeAccessibility(value: unknown): AdminAccessibilityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      typeId: Number(row.typeId),
      applies: row.applies === true,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}

function normalizeFacilities(value: unknown): AdminFacilityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      typeId: Number(row.typeId),
      quantity: row.quantity == null ? undefined : Number(row.quantity),
      detailOther:
        typeof row.detailOther === "string" ? row.detailOther : undefined,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}
