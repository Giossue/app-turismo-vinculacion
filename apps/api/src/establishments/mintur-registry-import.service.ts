import { randomUUID } from "node:crypto";

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  isOperatingStatus,
  normalizeText,
  parseMinturRegistry,
  type MinturRegistryRow,
  type MinturRegistryRowError,
  type MinturRegistryStatus,
} from "./mintur-registry.parser";
import { isInsideEcuador } from "../common/ecuador-bounds";

export type MinturImportPhase = "LEYENDO" | "GUARDANDO" | "TERMINADO" | "ERROR";

export type MinturImportJob = {
  id: string;
  fileName: string;
  phase: MinturImportPhase;
  startedAt: string;
  finishedAt: string | null;
  sheets: string[];
  totalRows: number;
  processedRows: number;
  created: number;
  updated: number;
  skipped: number;
  approximateCoordinates: number;
  /** Conteo de filas omitidas por motivo. */
  skippedByReason: Record<string, number>;
  /** Primeras filas omitidas, para que el administrador las ubique. */
  skippedSamples: MinturRegistryRowError[];
  error: string | null;
};

type ResolvedRow = {
  sheet: string;
  rowNumber: number;
  numeroRegistro: string;
  localidadId: number;
  ruc: string | null;
  codigoEstablecimientoRuc: string | null;
  nombreComercial: string;
  razonSocial: string | null;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  actividadId: number;
  clasificacionId: number | null;
  categoriaId: number | null;
  direccion: string | null;
  referenciaDireccion: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  sitioWeb: string | null;
  latitud: number;
  longitud: number;
  aproximadas: boolean;
  activo: boolean;
  estadoRegistro: MinturRegistryStatus | null;
  fechaRegistro: string | null;
  totalTrabajadores: number | null;
  totalHabitaciones: number | null;
  totalCamas: number | null;
  totalPlazas: number | null;
  totalMesas: number | null;
  capacidadPersonas: number | null;
  datos: Record<string, string>;
};

type Lookups = {
  provinces: Map<string, number>;
  cantons: Map<string, number>;
  /** canton|nombre → localidad POBLADO. */
  parishes: Map<string, number>;
  /** canton → cabecera cantonal (CIUDAD). */
  cities: Map<number, { id: number; lat: number | null; lon: number | null }>;
  activities: Map<string, { id: number; name: string }>;
  classifications: Map<string, { id: number; name: string }>;
  categories: Map<string, { id: number; name: string }>;
};

const CHUNK_SIZE = 500;
const MAX_SAMPLES = 200;
const JOB_TTL_MS = 60 * 60 * 1000;

/** Nombres del consolidado que difieren del cantón oficial de la DPA. */
const CANTON_ALIASES: Record<string, string> = {
  quito: "distrito metropolitano de quito",
  "francisco de orellana": "orellana",
  "san pedro de pelileo": "pelileo",
  "santiago de pillaro": "pillaro",
  "san jacinto de yaguachi": "yaguachi",
  salitre: "urbina jado",
};

/** Actividades que el consolidado 2026 renombró respecto del catálogo. */
const ACTIVITY_ALIASES: Record<string, string> = {
  "parques tematicos y atracciones estables": "parques de atracciones estables",
};

/** Prioridad cuando un registro aparece en varias hojas. */
const STATUS_RANK: Record<string, number> = {
  RATIFICADO: 5,
  PENDIENTE_INSPECCION: 4,
  SUSPENSION_TEMPORAL: 3,
  SUSPENSION_DEFINITIVA: 2,
  INACTIVO: 1,
};

@Injectable()
export class MinturRegistryImportService {
  private readonly logger = new Logger(MinturRegistryImportService.name);
  private readonly jobs = new Map<string, MinturImportJob>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Inicia la importación en segundo plano. Solo se permite una a la vez para
   * no competir por los mismos registros.
   */
  start(file: Buffer, fileName: string, actorId: number): MinturImportJob {
    this.pruneJobs();
    const running = [...this.jobs.values()].find(
      (job) => job.phase === "LEYENDO" || job.phase === "GUARDANDO",
    );
    if (running) {
      throw new ConflictException(
        "Ya hay una importación del catastro en curso. Espera a que termine.",
      );
    }
    const job: MinturImportJob = {
      id: randomUUID(),
      fileName: fileName.slice(0, 200),
      phase: "LEYENDO",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      sheets: [],
      totalRows: 0,
      processedRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      approximateCoordinates: 0,
      skippedByReason: {},
      skippedSamples: [],
      error: null,
    };
    this.jobs.set(job.id, job);
    void this.run(job, file, actorId).catch((error: unknown) => {
      this.logger.error(`Importación ${job.id} falló: ${String(error)}`);
      job.phase = "ERROR";
      job.error =
        error instanceof Error && error.message.startsWith("El archivo")
          ? error.message
          : "No se pudo importar el catastro. Revisa que sea el consolidado del MINTUR.";
      job.finishedAt = new Date().toISOString();
    });
    return { ...job };
  }

  status(id: string): MinturImportJob {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException("No se encontró la importación.");
    return { ...job };
  }

  private pruneJobs() {
    const limit = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (job.finishedAt && Date.parse(job.finishedAt) < limit)
        this.jobs.delete(id);
    }
  }

  private async run(job: MinturImportJob, file: Buffer, actorId: number) {
    const parsed = await parseMinturRegistry(file);
    job.sheets = parsed.sheets;
    if (!parsed.sheets.length) {
      throw new Error(
        "El archivo no tiene hojas con los encabezados del catastro MINTUR.",
      );
    }
    const rows = this.dedupe(parsed.rows);
    job.totalRows = rows.length + parsed.errors.length;
    parsed.errors.forEach((error) => this.skip(job, error));
    job.processedRows = parsed.errors.length;

    const lookups = await this.loadLookups();
    const centroids = this.centroids(rows);
    const resolved: ResolvedRow[] = [];
    for (const row of rows) {
      const item = this.resolve(row, lookups, centroids);
      if ("reason" in item) {
        this.skip(job, item);
        job.processedRows += 1;
      } else {
        resolved.push(item);
      }
    }

    job.phase = "GUARDANDO";
    for (let index = 0; index < resolved.length; index += CHUNK_SIZE) {
      const chunk = resolved.slice(index, index + CHUNK_SIZE);
      const result = await this.saveChunk(chunk, actorId);
      job.created += result.created;
      job.updated += result.updated;
      job.approximateCoordinates += chunk.filter(
        (row) => row.aproximadas,
      ).length;
      for (const numeroRegistro of result.deleted) {
        const row = chunk.find(
          (item) => item.numeroRegistro === numeroRegistro,
        );
        this.skip(job, {
          sheet: row?.sheet ?? "",
          rowNumber: row?.rowNumber ?? 0,
          numeroRegistro,
          reason: "Fue eliminado en el panel; no se restaura.",
        });
      }
      job.processedRows += chunk.length;
    }
    job.phase = "TERMINADO";
    job.finishedAt = new Date().toISOString();
    this.logger.log(
      `Importación ${job.id}: ${job.created} creados, ${job.updated} actualizados, ${job.skipped} omitidos.`,
    );
  }

  private skip(job: MinturImportJob, error: MinturRegistryRowError) {
    job.skipped += 1;
    job.skippedByReason[error.reason] =
      (job.skippedByReason[error.reason] ?? 0) + 1;
    if (job.skippedSamples.length < MAX_SAMPLES) job.skippedSamples.push(error);
  }

  /** Un registro repetido conserva la fila con el estado más vigente. */
  private dedupe(rows: MinturRegistryRow[]) {
    const byRegistration = new Map<string, MinturRegistryRow>();
    for (const row of rows) {
      const key = row.numeroRegistro;
      const previous = byRegistration.get(key);
      const rank = (item: MinturRegistryRow) =>
        STATUS_RANK[item.estadoRegistro ?? ""] ?? 0;
      if (!previous || rank(row) >= rank(previous))
        byRegistration.set(key, row);
    }
    return [...byRegistration.values()];
  }

  /**
   * Centro de las coordenadas válidas por parroquia y por cantón. Sirve de
   * ubicación aproximada para las filas sin coordenadas, que la app marca así.
   */
  private centroids(rows: MinturRegistryRow[]) {
    const sums = new Map<string, { lat: number; lon: number; count: number }>();
    const add = (key: string, lat: number, lon: number) => {
      const sum = sums.get(key) ?? { lat: 0, lon: 0, count: 0 };
      sum.lat += lat;
      sum.lon += lon;
      sum.count += 1;
      sums.set(key, sum);
    };
    for (const row of rows) {
      const point = this.validPoint(row);
      if (!point) continue;
      const canton = `${normalizeText(row.provincia)}|${normalizeText(row.canton)}`;
      add(canton, point.lat, point.lon);
      add(`${canton}|${normalizeText(row.parroquia)}`, point.lat, point.lon);
    }
    const centroids = new Map<string, { lat: number; lon: number }>();
    for (const [key, sum] of sums) {
      centroids.set(key, {
        lat: sum.lat / sum.count,
        lon: sum.lon / sum.count,
      });
    }
    return centroids;
  }

  private validPoint(row: Pick<MinturRegistryRow, "latitude" | "longitude">) {
    const { latitude: lat, longitude: lon } = row;
    if (lat === null || lon === null) return null;
    if (isInsideEcuador(lat, lon)) return { lat, lon };
    // Algunas filas tienen latitud y longitud intercambiadas.
    if (isInsideEcuador(lon, lat)) return { lat: lon, lon: lat };
    return null;
  }

  private resolve(
    row: MinturRegistryRow,
    lookups: Lookups,
    centroids: Map<string, { lat: number; lon: number }>,
  ): ResolvedRow | MinturRegistryRowError {
    const fail = (reason: string): MinturRegistryRowError => ({
      sheet: row.sheet,
      rowNumber: row.rowNumber,
      numeroRegistro: row.numeroRegistro,
      reason,
    });
    const province = normalizeText(row.provincia);
    const provinceId = lookups.provinces.get(province);
    if (!provinceId) return fail(`Provincia desconocida: ${row.provincia}.`);
    const cantonName = normalizeText(row.canton);
    const cantonId =
      lookups.cantons.get(`${provinceId}|${cantonName}`) ??
      lookups.cantons.get(`${provinceId}|${CANTON_ALIASES[cantonName] ?? ""}`);
    if (!cantonId) {
      return fail(`Cantón desconocido: ${row.canton} (${row.provincia}).`);
    }
    const parish = normalizeText(row.parroquia);
    const city = lookups.cities.get(cantonId);
    const localidadId =
      lookups.parishes.get(`${cantonId}|${parish}`) ?? city?.id;
    if (!localidadId)
      return fail(`El cantón ${row.canton} no tiene localidad activa.`);

    const activityName = normalizeText(row.actividad);
    const activity =
      lookups.activities.get(activityName) ??
      lookups.activities.get(ACTIVITY_ALIASES[activityName] ?? "");
    if (!activity) return fail(`Actividad desconocida: ${row.actividad}.`);
    const classification = row.clasificacion
      ? lookups.classifications.get(
          `${activity.id}|${normalizeText(row.clasificacion)}`,
        )
      : undefined;
    const category =
      classification && row.categoria
        ? lookups.categories.get(
            `${classification.id}|${normalizeText(row.categoria)}`,
          )
        : undefined;

    const cantonKey = `${province}|${cantonName}`;
    const point = this.validPoint(row);
    const approximate =
      centroids.get(`${cantonKey}|${parish}`) ??
      centroids.get(cantonKey) ??
      (city?.lat != null && city.lon != null
        ? { lat: city.lat, lon: city.lon }
        : null);
    const location = point ?? approximate;
    if (!location)
      return fail("No tiene coordenadas válidas ni una referencia cercana.");

    return {
      sheet: row.sheet,
      rowNumber: row.rowNumber,
      numeroRegistro: row.numeroRegistro,
      localidadId,
      ruc: row.ruc,
      codigoEstablecimientoRuc: row.codigoEstablecimientoRuc,
      nombreComercial: row.nombreComercial,
      razonSocial: row.razonSocial,
      actividad: activity.name,
      // La columna de texto admite 120 caracteres; el catálogo, hasta 180.
      clasificacion:
        (classification?.name ?? row.clasificacion)?.slice(0, 120) ?? null,
      categoria: (category?.name ?? row.categoria)?.slice(0, 120) ?? null,
      actividadId: activity.id,
      clasificacionId: classification?.id ?? null,
      categoriaId: category?.id ?? null,
      direccion: row.direccion,
      referenciaDireccion: row.referenciaDireccion,
      telefono: row.telefono,
      telefonoSecundario: row.telefonoSecundario,
      correo: row.correo,
      sitioWeb: row.sitioWeb,
      latitud: Number(location.lat.toFixed(7)),
      longitud: Number(location.lon.toFixed(7)),
      aproximadas: !point,
      activo: isOperatingStatus(row.estadoRegistro),
      estadoRegistro: row.estadoRegistro,
      fechaRegistro: row.fechaRegistro,
      totalTrabajadores: row.totalTrabajadores,
      totalHabitaciones: row.totalHabitaciones,
      totalCamas: row.totalCamas,
      totalPlazas: row.totalPlazas,
      totalMesas: row.totalMesas,
      capacidadPersonas: row.capacidadPersonas,
      datos: row.raw,
    };
  }

  private async loadLookups(): Promise<Lookups> {
    const query = <T>(sql: string) =>
      this.dataSource.query(sql) as Promise<T[]>;
    const [
      provinces,
      cantons,
      localities,
      activities,
      classifications,
      categories,
    ] = await Promise.all([
      query<{ id: string; name: string }>(
        `SELECT id, nombre AS name FROM provincias WHERE activo`,
      ),
      query<{ id: string; provinceId: string; name: string }>(
        `SELECT id, provincia_id AS "provinceId", nombre AS name
             FROM cantones WHERE activo`,
      ),
      query<{
        id: string;
        cantonId: string;
        name: string;
        type: string;
        lat: string | null;
        lon: string | null;
      }>(
        `SELECT id, canton_id AS "cantonId", nombre AS name,
                  tipo_localidad AS type, latitud AS lat, longitud AS lon
             FROM localidades WHERE activo
            ORDER BY id`,
      ),
      query<{ id: string; name: string }>(
        `SELECT id, nombre AS name FROM catalogo_catastro_actividades WHERE activo`,
      ),
      query<{ id: string; parentId: string; name: string; source: string }>(
        `SELECT c.id, c.actividad_id AS "parentId", c.nombre AS name, c.nombre AS source
             FROM catalogo_catastro_clasificaciones c WHERE c.activo
           UNION ALL
           SELECT c.id, c.actividad_id, c.nombre, a.valor_fuente
             FROM catalogo_catastro_clasificacion_aliases a
             JOIN catalogo_catastro_clasificaciones c ON c.id = a.clasificacion_id
            WHERE c.activo`,
      ),
      query<{ id: string; parentId: string; name: string; source: string }>(
        `SELECT c.id, c.clasificacion_id AS "parentId", c.nombre AS name, c.nombre AS source
             FROM catalogo_catastro_categorias c WHERE c.activo
           UNION ALL
           SELECT c.id, c.clasificacion_id, c.nombre, a.valor_fuente
             FROM catalogo_catastro_categoria_aliases a
             JOIN catalogo_catastro_categorias c ON c.id = a.categoria_id
            WHERE c.activo`,
      ),
    ]);
    const lookups: Lookups = {
      provinces: new Map(),
      cantons: new Map(),
      parishes: new Map(),
      cities: new Map(),
      activities: new Map(),
      classifications: new Map(),
      categories: new Map(),
    };
    for (const row of provinces)
      lookups.provinces.set(normalizeText(row.name), Number(row.id));
    for (const row of cantons) {
      lookups.cantons.set(
        `${row.provinceId}|${normalizeText(row.name)}`,
        Number(row.id),
      );
    }
    for (const row of localities) {
      const cantonId = Number(row.cantonId);
      if (row.type === "CIUDAD") {
        if (!lookups.cities.has(cantonId)) {
          lookups.cities.set(cantonId, {
            id: Number(row.id),
            lat: row.lat === null ? null : Number(row.lat),
            lon: row.lon === null ? null : Number(row.lon),
          });
        }
        // Las parroquias urbanas se agrupan en la cabecera cantonal.
        lookups.parishes.set(
          `${cantonId}|${normalizeText(row.name)}`,
          Number(row.id),
        );
      } else {
        lookups.parishes.set(
          `${cantonId}|${normalizeText(row.name)}`,
          Number(row.id),
        );
      }
    }
    for (const row of activities) {
      lookups.activities.set(normalizeText(row.name), {
        id: Number(row.id),
        name: row.name,
      });
    }
    for (const row of classifications) {
      lookups.classifications.set(
        `${row.parentId}|${normalizeText(row.source)}`,
        {
          id: Number(row.id),
          name: row.name,
        },
      );
    }
    for (const row of categories) {
      lookups.categories.set(`${row.parentId}|${normalizeText(row.source)}`, {
        id: Number(row.id),
        name: row.name,
      });
    }
    return lookups;
  }

  /**
   * Crea o actualiza por número de registro en una sola sentencia. No toca el
   * responsable ni la revisión de un registro existente, no restaura los
   * eliminados y no reemplaza coordenadas exactas por aproximadas.
   */
  private async saveChunk(rows: ResolvedRow[], actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const saved = (await manager.query(
        `WITH input AS (
           SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(
             "numeroRegistro" text, "localidadId" bigint, ruc text,
             "codigoEstablecimientoRuc" text, "nombreComercial" text,
             "razonSocial" text, actividad text, clasificacion text,
             categoria text, "actividadId" bigint, "clasificacionId" bigint,
             "categoriaId" bigint, direccion text, "referenciaDireccion" text,
             telefono text, "telefonoSecundario" text, correo text,
             "sitioWeb" text, latitud numeric, longitud numeric,
             aproximadas boolean, activo boolean, "estadoRegistro" text,
             "fechaRegistro" date, "totalTrabajadores" integer,
             "totalHabitaciones" integer, "totalCamas" integer,
             "totalPlazas" integer, "totalMesas" integer,
             "capacidadPersonas" integer, datos jsonb
           )
         ),
         saved AS (
           INSERT INTO establecimientos_turisticos AS e (
             localidad_id, numero_registro, ruc, codigo_establecimiento_ruc,
             nombre_comercial, razon_social, actividad, clasificacion, categoria,
             actividad_catalogo_id, clasificacion_catalogo_id, categoria_catalogo_id,
             direccion, referencia_direccion, telefono, telefono_secundario,
             correo, sitio_web, latitud, longitud, ubicacion,
             coordenadas_aproximadas, activo, responsable_usuario_id,
             estado_revision, estado_registro_mintur, fecha_registro_mintur,
             total_trabajadores, total_habitaciones, total_camas, total_plazas,
             total_mesas, capacidad_personas, datos_mintur, importado_mintur_at,
             created_at, updated_at
           )
           SELECT "localidadId", "numeroRegistro", ruc, "codigoEstablecimientoRuc",
                  "nombreComercial", "razonSocial", actividad, clasificacion, categoria,
                  "actividadId", "clasificacionId", "categoriaId",
                  direccion, "referenciaDireccion", telefono, "telefonoSecundario",
                  correo, "sitioWeb", latitud, longitud,
                  ST_SetSRID(ST_MakePoint(longitud::double precision, latitud::double precision), 4326)::geography,
                  aproximadas, activo, $2, 'PUBLICADO', "estadoRegistro",
                  "fechaRegistro", "totalTrabajadores", "totalHabitaciones",
                  "totalCamas", "totalPlazas", "totalMesas", "capacidadPersonas",
                  datos, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             FROM input
           ON CONFLICT (numero_registro) DO UPDATE SET
             localidad_id = EXCLUDED.localidad_id,
             ruc = EXCLUDED.ruc,
             codigo_establecimiento_ruc = EXCLUDED.codigo_establecimiento_ruc,
             nombre_comercial = EXCLUDED.nombre_comercial,
             razon_social = EXCLUDED.razon_social,
             actividad = EXCLUDED.actividad,
             clasificacion = EXCLUDED.clasificacion,
             categoria = EXCLUDED.categoria,
             actividad_catalogo_id = EXCLUDED.actividad_catalogo_id,
             clasificacion_catalogo_id = EXCLUDED.clasificacion_catalogo_id,
             categoria_catalogo_id = EXCLUDED.categoria_catalogo_id,
             direccion = EXCLUDED.direccion,
             referencia_direccion = EXCLUDED.referencia_direccion,
             telefono = EXCLUDED.telefono,
             telefono_secundario = EXCLUDED.telefono_secundario,
             correo = EXCLUDED.correo,
             sitio_web = EXCLUDED.sitio_web,
             latitud = CASE WHEN EXCLUDED.coordenadas_aproximadas AND NOT e.coordenadas_aproximadas
                            THEN e.latitud ELSE EXCLUDED.latitud END,
             longitud = CASE WHEN EXCLUDED.coordenadas_aproximadas AND NOT e.coordenadas_aproximadas
                             THEN e.longitud ELSE EXCLUDED.longitud END,
             ubicacion = CASE WHEN EXCLUDED.coordenadas_aproximadas AND NOT e.coordenadas_aproximadas
                              THEN e.ubicacion ELSE EXCLUDED.ubicacion END,
             coordenadas_aproximadas = EXCLUDED.coordenadas_aproximadas
                                       AND e.coordenadas_aproximadas,
             activo = EXCLUDED.activo,
             estado_registro_mintur = EXCLUDED.estado_registro_mintur,
             fecha_registro_mintur = EXCLUDED.fecha_registro_mintur,
             total_trabajadores = EXCLUDED.total_trabajadores,
             total_habitaciones = EXCLUDED.total_habitaciones,
             total_camas = EXCLUDED.total_camas,
             total_plazas = EXCLUDED.total_plazas,
             total_mesas = EXCLUDED.total_mesas,
             capacidad_personas = EXCLUDED.capacidad_personas,
             datos_mintur = EXCLUDED.datos_mintur,
             importado_mintur_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
           WHERE e.eliminado_at IS NULL
           RETURNING e.id, e.numero_registro, e.nombre_comercial, (xmax = 0) AS inserted
         ),
         audited AS (
           INSERT INTO auditoria_catalogos
             (usuario_id, catalogo_codigo, registro_id, accion, datos_anteriores, datos_nuevos)
           SELECT $2, 'ESTABLISHMENT', id,
                  CASE WHEN inserted THEN 'CREAR' ELSE 'MODIFICAR' END,
                  '{}'::jsonb,
                  jsonb_build_object(
                    'fuente', 'CATASTRO_MINTUR',
                    'numeroRegistro', numero_registro,
                    'nombreComercial', nombre_comercial
                  )
             FROM saved
         )
         SELECT numero_registro AS "numeroRegistro", inserted FROM saved`,
        [JSON.stringify(rows), actorId],
      )) as Array<{ numeroRegistro: string; inserted: boolean }>;
      const savedKeys = new Set(saved.map((row) => row.numeroRegistro));
      return {
        created: saved.filter((row) => row.inserted).length,
        updated: saved.filter((row) => !row.inserted).length,
        deleted: rows
          .map((row) => row.numeroRegistro)
          .filter((key) => !savedKeys.has(key)),
      };
    });
  }
}
