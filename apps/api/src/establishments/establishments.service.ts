import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import type {
  AdminEstablishmentsQueryDto,
  CreateEstablishmentDto,
  PublicEstablishmentsMapQueryDto,
  PublicEstablishmentsQueryDto,
  SaveEstablishmentDto,
} from "./establishments.dto";

type EstablishmentRow = {
  id: string;
  localityId: string;
  localityName: string;
  localityType: string;
  cantonName: string;
  provinceName: string;
  numeroRegistro: string | null;
  ruc: string | null;
  nombreComercial: string;
  razonSocial: string | null;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  activityId: string | null;
  classificationId: string | null;
  categoryId: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: string | null;
  longitude: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  distanceMeters?: string | null;
};

type LocalityRow = {
  id: string;
  name: string;
  type: string;
  cantonName: string;
  provinceName: string;
  distanceMeters?: string | null;
};

type AdminEstablishmentItem = {
  id: number;
  localityId: number;
  localityName: string;
  localityType: string;
  cantonName: string;
  provinceName: string;
  numeroRegistro: string | null;
  ruc: string | null;
  nombreComercial: string;
  razonSocial: string | null;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  activityId: number | null;
  classificationId: number | null;
  categoryId: number | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ResolvedTaxonomy = {
  activityId: number | null;
  classificationId: number | null;
  categoryId: number | null;
  activity: string;
  classification: string | null;
  category: string | null;
};

const establishmentSelect = `
  SELECT e.id,
         e.localidad_id AS "localityId",
         l.nombre AS "localityName",
         l.tipo_localidad AS "localityType",
         co.nombre AS "cantonName",
         p.nombre AS "provinceName",
         e.numero_registro AS "numeroRegistro",
         e.ruc,
         e.nombre_comercial AS "nombreComercial",
         e.razon_social AS "razonSocial",
         COALESCE(activity_catalog.nombre, e.actividad) AS actividad,
         COALESCE(classification_catalog.nombre, e.clasificacion) AS clasificacion,
         COALESCE(category_catalog.nombre, e.categoria) AS categoria,
         e.actividad_catalogo_id AS "activityId",
         e.clasificacion_catalogo_id AS "classificationId",
         e.categoria_catalogo_id AS "categoryId",
         e.direccion,
         e.telefono,
         e.latitud AS latitude,
         e.longitud AS longitude,
         e.activo AS active,
         e.created_at AS "createdAt",
         e.updated_at AS "updatedAt"`;

const establishmentJoin = `
    FROM establecimientos_turisticos e
    JOIN localidades l ON l.id = e.localidad_id
    JOIN cantones co ON co.id = l.canton_id
    JOIN provincias p ON p.id = co.provincia_id
    LEFT JOIN catalogo_catastro_actividades activity_catalog
      ON activity_catalog.id = e.actividad_catalogo_id
    LEFT JOIN catalogo_catastro_clasificaciones classification_catalog
      ON classification_catalog.id = e.clasificacion_catalogo_id
    LEFT JOIN catalogo_catastro_categorias category_catalog
      ON category_catalog.id = e.categoria_catalogo_id`;

@Injectable()
export class EstablishmentsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(query: AdminEstablishmentsQueryDto) {
    const params: unknown[] = [];
    const where: string[] = [];
    const add = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (query.active !== undefined)
      where.push(`e.activo = ${add(query.active)}`);
    if (query.localityId !== undefined)
      where.push(`e.localidad_id = ${add(query.localityId)}`);
    if (query.provinceId !== undefined)
      where.push(`co.provincia_id = ${add(query.provinceId)}`);
    if (query.cantonId !== undefined)
      where.push(`l.canton_id = ${add(query.cantonId)}`);
    if (query.activity)
      where.push(
        `COALESCE(activity_catalog.nombre, e.actividad) ILIKE ${add(`%${query.activity}%`)}`,
      );
    if (query.classification)
      where.push(
        `COALESCE(classification_catalog.nombre, e.clasificacion) ILIKE ${add(`%${query.classification}%`)}`,
      );
    if (query.category)
      where.push(
        `COALESCE(category_catalog.nombre, e.categoria) ILIKE ${add(`%${query.category}%`)}`,
      );
    if (query.q) {
      const term = add(`%${query.q}%`);
      where.push(
        `(e.nombre_comercial ILIKE ${term} OR e.numero_registro ILIKE ${term} OR COALESCE(activity_catalog.nombre, e.actividad) ILIKE ${term} OR e.direccion ILIKE ${term})`,
      );
    }

    const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countRows = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS total ${establishmentJoin} ${condition}`,
      params,
    )) as Array<{ total: number }>;
    const limitParam = add(query.limit ?? 25);
    const offsetParam = add(query.offset ?? 0);
    const rows = (await this.dataSource.query(
      `${establishmentSelect} ${establishmentJoin} ${condition}
       ORDER BY e.nombre_comercial, e.id
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    )) as EstablishmentRow[];

    return {
      items: rows.map((row) => this.toAdminItem(row)),
      total: Number(countRows[0]?.total ?? 0),
      limit: query.limit ?? 25,
      offset: query.offset ?? 0,
    };
  }

  async find(id: string) {
    const numericId = this.parseId(id);
    const rows = (await this.dataSource.query(
      `${establishmentSelect} ${establishmentJoin} WHERE e.id = $1`,
      [numericId],
    )) as EstablishmentRow[];
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró el establecimiento.");
    return this.toAdminItem(row);
  }

  async create(actorId: number, input: CreateEstablishmentDto) {
    const required = this.requireCreateFields(input);
    return this.dataSource.transaction(async (manager) => {
      await this.assertLocality(manager, required.localityId);
      await this.assertUniqueRegistration(manager, input.numeroRegistro);
      const taxonomy = await this.resolveTaxonomy(manager, input);
      const row = await this.insert(manager, input, taxonomy, required);
      const created = await this.findWithManager(manager, row.id);
      await this.audit(
        manager,
        Number(row.id),
        actorId,
        "CREAR",
        null,
        created,
      );
      return created;
    });
  }

  async save(id: string, actorId: number, input: SaveEstablishmentDto) {
    const numericId = this.parseId(id);
    return this.dataSource.transaction(async (manager) => {
      const current = await this.findWithManager(manager, numericId, true);
      const nextLocalityId = input.localityId ?? Number(current.localityId);
      const nextLatitude =
        input.latitude ?? this.toNullableNumber(current.latitude);
      const nextLongitude =
        input.longitude ?? this.toNullableNumber(current.longitude);
      if (nextLatitude === null || nextLongitude === null) {
        throw new BadRequestException(
          "La latitud y la longitud son obligatorias y deben enviarse juntas.",
        );
      }
      await this.assertLocality(manager, nextLocalityId);
      if (
        input.numeroRegistro !== undefined &&
        input.numeroRegistro !== current.numeroRegistro
      ) {
        await this.assertUniqueRegistration(
          manager,
          input.numeroRegistro,
          numericId,
        );
      }
      const taxonomy = await this.resolveTaxonomy(manager, input, current);

      const values = [
        nextLocalityId,
        input.numeroRegistro !== undefined
          ? input.numeroRegistro || null
          : current.numeroRegistro,
        input.ruc !== undefined ? input.ruc || null : current.ruc,
        input.nombreComercial?.trim() || current.nombreComercial,
        input.razonSocial !== undefined
          ? input.razonSocial || null
          : current.razonSocial,
        taxonomy.activity,
        taxonomy.classification,
        taxonomy.category,
        taxonomy.activityId,
        taxonomy.classificationId,
        taxonomy.categoryId,
        input.direccion !== undefined
          ? input.direccion || null
          : current.direccion,
        input.telefono !== undefined
          ? input.telefono || null
          : current.telefono,
        nextLatitude,
        nextLongitude,
        numericId,
      ];
      await manager.query(
        `UPDATE establecimientos_turisticos
            SET localidad_id = $1,
                numero_registro = $2,
                ruc = $3,
                nombre_comercial = $4,
                razon_social = $5,
                actividad = $6,
                clasificacion = $7,
                categoria = $8,
                actividad_catalogo_id = $9,
                clasificacion_catalogo_id = $10,
                categoria_catalogo_id = $11,
                direccion = $12,
                telefono = $13,
                latitud = $14,
                longitud = $15,
                ubicacion = ST_SetSRID(ST_MakePoint($15::double precision, $14::double precision), 4326)::geography,
                coordenadas_aproximadas = CASE
                  WHEN latitud IS DISTINCT FROM $14::numeric
                    OR longitud IS DISTINCT FROM $15::numeric
                  THEN FALSE
                  ELSE coordenadas_aproximadas
                END,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $16`,
        values,
      );
      const saved = await this.findWithManager(manager, numericId);
      await this.audit(
        manager,
        numericId,
        actorId,
        "MODIFICAR",
        current,
        saved,
      );
      return saved;
    });
  }

  async setActive(id: string, actorId: number, active: boolean) {
    const numericId = this.parseId(id);
    return this.dataSource.transaction(async (manager) => {
      const current = await this.findWithManager(manager, numericId, true);
      if (current.active === active) return current;
      await manager.query(
        `UPDATE establecimientos_turisticos
            SET activo = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [active, numericId],
      );
      const saved = await this.findWithManager(manager, numericId);
      await this.audit(
        manager,
        numericId,
        actorId,
        active ? "ACTIVAR" : "DESACTIVAR",
        current,
        saved,
      );
      return saved;
    });
  }

  async getAudit(id: string) {
    const numericId = this.parseId(id);
    const rows = await this.dataSource.query(
      `SELECT a.accion AS action,
              a.datos_anteriores AS "previous",
              a.datos_nuevos AS "next",
              a.created_at AS "createdAt",
              u.nombre AS actor
         FROM auditoria_catalogos a
         JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.catalogo_codigo = 'ESTABLISHMENT'
          AND a.registro_id = $1
        ORDER BY a.created_at DESC, a.id DESC`,
      [numericId],
    );
    return { items: rows };
  }

  async map(query: PublicEstablishmentsMapQueryDto) {
    const bounds = [query.west, query.south, query.east, query.north];
    const hasAnyBound = bounds.some((value) => value !== undefined);
    const hasAllBounds = bounds.every((value) => value !== undefined);
    if (hasAnyBound && !hasAllBounds) {
      throw new BadRequestException(
        "El mapa requiere los cuatro límites del viewport.",
      );
    }

    const params: unknown[] = [];
    const add = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const latitudeExpression = "e.latitud";
    const longitudeExpression = "e.longitud";
    const where = [
      "e.activo = TRUE",
      `${latitudeExpression} IS NOT NULL`,
      `${longitudeExpression} IS NOT NULL`,
    ];
    if (hasAllBounds) {
      const west = add(query.west);
      const south = add(query.south);
      const east = add(query.east);
      const north = add(query.north);
      where.push(
        `${longitudeExpression} BETWEEN ${west} AND ${east}`,
        `${latitudeExpression} BETWEEN ${south} AND ${north}`,
      );
    }
    const limit = add(Math.min(query.limit ?? 500, 500));
    const rows = (await this.dataSource.query(
      `SELECT e.nombre_comercial AS name,
              COALESCE(category_catalog.nombre, e.categoria) AS category,
              ${latitudeExpression}::double precision AS latitude,
              ${longitudeExpression}::double precision AS longitude,
              e.coordenadas_aproximadas AS approximate,
              COALESCE(NULLIF(category_catalog.icono, 'mapPin'), 'hotel') AS icon,
              COALESCE(category_catalog.color, '#7c3aed') AS color
         ${establishmentJoin}
        WHERE ${where.join(" AND ")}
        ORDER BY e.nombre_comercial, e.id
        LIMIT ${limit}`,
      params,
    )) as Array<{
      name: string;
      category: string | null;
      latitude: string | number;
      longitude: string | number;
      approximate: boolean;
      icon: string;
      color: string;
    }>;

    return {
      items: rows.map((row) => ({
        name: row.name,
        category: row.category,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        approximate: row.approximate,
        icon: row.icon,
        color: row.color,
      })),
    };
  }

  async nearby(query: PublicEstablishmentsQueryDto) {
    const activity = query.activity?.trim() || query.q?.trim();
    if (!activity) {
      throw new BadRequestException(
        "Indica la actividad o el texto del catastro que quieres encontrar.",
      );
    }
    if ((query.latitude !== undefined) !== (query.longitude !== undefined)) {
      throw new BadRequestException(
        "La latitud y la longitud deben enviarse juntas.",
      );
    }

    const requested = query.localityId
      ? await this.findLocality(query.localityId)
      : query.latitude !== undefined
        ? await this.findNearestLocality(
            query.latitude,
            query.longitude!,
            activity,
            query.category,
          )
        : null;

    if (query.localityId && !requested) {
      throw new NotFoundException("La localidad no existe o está inactiva.");
    }

    if (!requested && query.latitude === undefined) {
      throw new BadRequestException(
        "Indica una localidad o la ubicación actual para buscar el catastro.",
      );
    }

    const directItems = requested
      ? await this.findPublicInLocality(
          requested.id,
          activity,
          query.category,
          query.latitude,
          query.longitude,
          query.limit ?? 20,
        )
      : [];
    if (directItems.length > 0) {
      return this.nearbyResponse(
        directItems,
        requested!,
        false,
        requested!.name,
      );
    }

    const fallback = await this.findFallbackLocality(
      requested?.id ?? null,
      activity,
      query.category,
      query.latitude,
      query.longitude,
    );
    if (!fallback) {
      return this.nearbyResponse([], requested, false, requested?.name ?? null);
    }
    const fallbackItems = await this.findPublicInLocality(
      fallback.id,
      activity,
      query.category,
      query.latitude,
      query.longitude,
      query.limit ?? 20,
    );
    return this.nearbyResponse(
      fallbackItems,
      fallback,
      true,
      requested?.name ?? null,
    );
  }

  private async findWithManager(
    manager: EntityManager,
    id: string | number,
    lock = false,
  ) {
    const rows = (await manager.query(
      `${establishmentSelect} ${establishmentJoin} WHERE e.id = $1${lock ? " FOR UPDATE OF e" : ""}`,
      [id],
    )) as EstablishmentRow[];
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró el establecimiento.");
    return this.toAdminItem(row);
  }

  private async insert(
    manager: EntityManager,
    input: CreateEstablishmentDto,
    taxonomy: ResolvedTaxonomy,
    required: {
      localityId: number;
      nombreComercial: string;
      latitude: number;
      longitude: number;
    },
  ) {
    const rows = (await manager.query(
      `INSERT INTO establecimientos_turisticos (
         localidad_id, numero_registro, ruc, nombre_comercial, razon_social,
         actividad, clasificacion, categoria,
         actividad_catalogo_id, clasificacion_catalogo_id, categoria_catalogo_id,
         direccion, telefono, latitud, longitud, ubicacion,
         coordenadas_aproximadas, activo, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         ST_SetSRID(ST_MakePoint($15::double precision, $14::double precision), 4326)::geography,
         FALSE,
         TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       ) RETURNING id`,
      [
        required.localityId,
        input.numeroRegistro || null,
        input.ruc || null,
        required.nombreComercial,
        input.razonSocial || null,
        taxonomy.activity,
        taxonomy.classification,
        taxonomy.category,
        taxonomy.activityId,
        taxonomy.classificationId,
        taxonomy.categoryId,
        input.direccion || null,
        input.telefono || null,
        required.latitude,
        required.longitude,
      ],
    )) as Array<{ id: string }>;
    return rows[0];
  }

  private async resolveTaxonomy(
    manager: EntityManager,
    input: SaveEstablishmentDto,
    current?: AdminEstablishmentItem,
  ): Promise<ResolvedTaxonomy> {
    const changed = (
      value: string | undefined,
      previous: string | null | undefined,
    ) =>
      value !== undefined &&
      this.normalizedValue(value) !== this.normalizedValue(previous);
    const activityChanged = Boolean(
      current &&
      ((input.activityId !== undefined &&
        input.activityId !== current.activityId) ||
        (input.activityId === undefined &&
          changed(input.actividad, current.actividad))),
    );
    const classificationChanged = Boolean(
      current &&
      ((input.classificationId !== undefined &&
        input.classificationId !== current.classificationId) ||
        (input.classificationId === undefined &&
          changed(input.clasificacion, current.clasificacion))),
    );

    let activityId =
      activityChanged && input.activityId === undefined
        ? null
        : (input.activityId ?? current?.activityId ?? null);
    let classificationId =
      activityChanged && input.classificationId === undefined
        ? null
        : (input.classificationId ?? current?.classificationId ?? null);
    let categoryId =
      (activityChanged || classificationChanged) &&
      input.categoryId === undefined
        ? null
        : (input.categoryId ?? current?.categoryId ?? null);
    let activity = input.actividad?.trim() || current?.actividad || "";
    let classification =
      input.clasificacion !== undefined
        ? input.clasificacion.trim() || null
        : (current?.clasificacion ?? null);
    let category =
      input.categoria !== undefined
        ? input.categoria.trim() || null
        : (current?.categoria ?? null);

    let activityRow: { id: string; name: string } | undefined;
    if (activityId !== null) {
      const rows = (await manager.query(
        `SELECT id, nombre AS name
           FROM catalogo_catastro_actividades
          WHERE id = $1${input.activityId !== undefined ? " AND activo = TRUE" : ""}`,
        [activityId],
      )) as Array<{ id: string; name: string }>;
      activityRow = rows[0];
      if (!activityRow) {
        throw new BadRequestException(
          "La actividad seleccionada no existe o está inactiva.",
        );
      }
      activityId = Number(activityRow.id);
      activity = activityRow.name;
    }

    let classificationRow:
      { id: string; activityId: string; name: string } | undefined;
    if (classificationId !== null) {
      const rows = (await manager.query(
        `SELECT id, actividad_id AS "activityId", nombre AS name
           FROM catalogo_catastro_clasificaciones
          WHERE id = $1
            AND ($2::bigint IS NULL OR actividad_id = $2)
            ${input.classificationId !== undefined ? "AND activo = TRUE" : ""}`,
        [classificationId, activityId],
      )) as Array<{ id: string; activityId: string; name: string }>;
      classificationRow = rows[0];
      if (!classificationRow) {
        throw new BadRequestException(
          "La clasificación no pertenece a la actividad seleccionada o está inactiva.",
        );
      }
      classificationId = Number(classificationRow.id);
      if (activityId === null)
        activityId = Number(classificationRow.activityId);
      classification = classificationRow.name;
    }

    let categoryRow:
      | {
          id: string;
          classificationId: string;
          activityId: string;
          categoryName: string;
          classificationName: string;
          activityName: string;
        }
      | undefined;
    if (categoryId !== null) {
      const rows = (await manager.query(
        `SELECT category.id,
                category.clasificacion_id AS "classificationId",
                classification.actividad_id AS "activityId",
                category.nombre AS "categoryName",
                classification.nombre AS "classificationName",
                activity.nombre AS "activityName"
           FROM catalogo_catastro_categorias category
           JOIN catalogo_catastro_clasificaciones classification
             ON classification.id = category.clasificacion_id
           JOIN catalogo_catastro_actividades activity
             ON activity.id = classification.actividad_id
          WHERE category.id = $1
            AND ($2::bigint IS NULL OR category.clasificacion_id = $2)
            AND ($3::bigint IS NULL OR classification.actividad_id = $3)
            ${input.categoryId !== undefined ? "AND category.activo = TRUE" : ""}`,
        [categoryId, classificationId, activityId],
      )) as Array<{
        id: string;
        classificationId: string;
        activityId: string;
        categoryName: string;
        classificationName: string;
        activityName: string;
      }>;
      categoryRow = rows[0];
      if (!categoryRow) {
        throw new BadRequestException(
          "La categoría no pertenece a la clasificación seleccionada o está inactiva.",
        );
      }
      categoryId = Number(categoryRow.id);
      classificationId = Number(categoryRow.classificationId);
      activityId = Number(categoryRow.activityId);
      activity = categoryRow.activityName;
      classification = categoryRow.classificationName;
      category = categoryRow.categoryName;
    }

    if (activityId !== null && !activityRow) {
      const rows = (await manager.query(
        `SELECT id, nombre AS name FROM catalogo_catastro_actividades WHERE id = $1`,
        [activityId],
      )) as Array<{ id: string; name: string }>;
      activityRow = rows[0];
      if (activityRow) activity = activityRow.name;
    }
    if (classificationId !== null && !classificationRow && !categoryRow) {
      const rows = (await manager.query(
        `SELECT id, actividad_id AS "activityId", nombre AS name
           FROM catalogo_catastro_clasificaciones WHERE id = $1`,
        [classificationId],
      )) as Array<{ id: string; activityId: string; name: string }>;
      classificationRow = rows[0];
      if (classificationRow) {
        classification = classificationRow.name;
        if (activityId === null)
          activityId = Number(classificationRow.activityId);
      }
    }

    return {
      activityId,
      classificationId,
      categoryId,
      activity,
      classification,
      category,
    };
  }

  private async assertLocality(manager: EntityManager, localityId: number) {
    const rows = await manager.query(
      `SELECT 1 FROM localidades WHERE id = $1 AND activo = TRUE`,
      [localityId],
    );
    if (!rows[0])
      throw new NotFoundException("La localidad no existe o está inactiva.");
  }

  private async assertUniqueRegistration(
    manager: EntityManager,
    registration: string | undefined,
    exceptId?: number,
  ) {
    if (!registration) return;
    const rows = await manager.query(
      `SELECT 1 FROM establecimientos_turisticos
        WHERE numero_registro = $1 AND ($2::bigint IS NULL OR id <> $2)
        LIMIT 1`,
      [registration, exceptId ?? null],
    );
    if (rows[0]) {
      throw new ConflictException(
        "El número de registro ya está asignado a otro establecimiento.",
      );
    }
  }

  private requireCreateFields(input: CreateEstablishmentDto) {
    const latitude = input.latitude;
    const longitude = input.longitude;
    if (
      !input.localityId ||
      !input.nombreComercial?.trim() ||
      (!input.actividad?.trim() && !input.activityId)
    ) {
      throw new BadRequestException(
        "La localidad, el nombre comercial y la actividad son obligatorios.",
      );
    }
    if (
      latitude === undefined ||
      longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException(
        "La latitud y la longitud son obligatorias y deben estar dentro de un rango válido.",
      );
    }
    return {
      localityId: input.localityId,
      nombreComercial: input.nombreComercial.trim(),
      latitude,
      longitude,
    };
  }

  private async findLocality(id: number): Promise<LocalityRow | null> {
    const rows = (await this.dataSource.query(
      this.localitySelect() + " WHERE l.id = $1 AND l.activo = TRUE",
      [id],
    )) as LocalityRow[];
    return rows[0] ?? null;
  }

  private async findNearestLocality(
    latitude: number,
    longitude: number,
    activity: string,
    category?: string,
  ): Promise<LocalityRow | null> {
    const rows = (await this.dataSource.query(
      `${this.localitySelect(
        `ST_Distance(
                COALESCE(l.ubicacion, ST_SetSRID(ST_MakePoint(l.longitud, l.latitud), 4326)::geography),
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) AS "distanceMeters"`,
      )}
         WHERE l.activo = TRUE
           AND l.tipo_localidad = 'CIUDAD'
           AND COALESCE(l.ubicacion, ST_SetSRID(ST_MakePoint(l.longitud, l.latitud), 4326)::geography) IS NOT NULL
           AND EXISTS (${this.matchingEstablishmentSql("$3", "$4")})
         ORDER BY "distanceMeters" NULLS LAST, l.id
         LIMIT 1`,
      [latitude, longitude, activity, category ?? null],
    )) as LocalityRow[];
    return rows[0] ?? null;
  }

  private async findFallbackLocality(
    requestedId: string | null,
    activity: string,
    category: string | undefined,
    latitude?: number,
    longitude?: number,
  ): Promise<LocalityRow | null> {
    const origin =
      latitude !== undefined && longitude !== undefined
        ? "ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography"
        : `(SELECT COALESCE(l0.ubicacion, ST_SetSRID(ST_MakePoint(l0.longitud, l0.latitud), 4326)::geography)
             FROM localidades l0 WHERE l0.id = $1)`;
    const rows = (await this.dataSource.query(
      `${this.localitySelect(
        `ST_Distance(
                COALESCE(l.ubicacion, ST_SetSRID(ST_MakePoint(l.longitud, l.latitud), 4326)::geography),
                ${origin}
              ) AS "distanceMeters"`,
      )}
         WHERE l.activo = TRUE
           AND l.tipo_localidad = 'CIUDAD'
           AND ${origin} IS NOT NULL
           AND COALESCE(l.ubicacion, ST_SetSRID(ST_MakePoint(l.longitud, l.latitud), 4326)::geography) IS NOT NULL
           AND ($1::bigint IS NULL OR l.id <> $1)
           AND EXISTS (${this.matchingEstablishmentSql("$2", "$5")})
         ORDER BY "distanceMeters" NULLS LAST, l.id
         LIMIT 1`,
      [
        requestedId,
        activity,
        latitude ?? null,
        longitude ?? null,
        category ?? null,
      ],
    )) as LocalityRow[];
    return rows[0] ?? null;
  }

  private async findPublicInLocality(
    localityId: string,
    activity: string,
    category: string | undefined,
    latitude: number | undefined,
    longitude: number | undefined,
    limit: number,
  ) {
    const hasPoint = latitude !== undefined && longitude !== undefined;
    const distanceExpression = hasPoint
      ? `ST_Distance(
           COALESCE(e.ubicacion, l.ubicacion),
           ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
         )`
      : "NULL::double precision";
    const rows = (await this.dataSource.query(
      `${establishmentSelect}, ${distanceExpression} AS "distanceMeters"
         ${establishmentJoin}
        WHERE e.localidad_id = $1
          AND e.activo = TRUE
          AND ${this.matchingActivitySql("e", "$2", "$5")}
        ORDER BY "distanceMeters" NULLS LAST, e.nombre_comercial, e.id
        LIMIT $6`,
      [
        localityId,
        activity,
        latitude ?? null,
        longitude ?? null,
        category ?? null,
        limit,
      ],
    )) as EstablishmentRow[];
    return rows.map((row) => this.toPublicItem(row));
  }

  private matchingEstablishmentSql(
    activityParam: string,
    categoryParam: string,
  ) {
    return `
      SELECT 1 FROM establecimientos_turisticos e_match
       LEFT JOIN catalogo_catastro_actividades activity_match
         ON activity_match.id = e_match.actividad_catalogo_id
       LEFT JOIN catalogo_catastro_categorias category_match
         ON category_match.id = e_match.categoria_catalogo_id
       WHERE e_match.localidad_id = l.id
         AND e_match.activo = TRUE
         AND ${this.normalizedSql("COALESCE(activity_match.nombre, e_match.actividad)")} = ${this.normalizedSql(activityParam)}
         AND (${categoryParam}::text IS NULL OR ${this.normalizedSql("COALESCE(category_match.nombre, e_match.categoria)")} = ${this.normalizedSql(categoryParam)})`;
  }

  private matchingActivitySql(
    alias: string,
    activityParam: string,
    categoryParam: string,
  ) {
    return `${this.normalizedSql(`COALESCE(activity_catalog.nombre, ${alias}.actividad)`)} = ${this.normalizedSql(activityParam)}
            AND (${categoryParam}::text IS NULL OR ${this.normalizedSql(`COALESCE(category_catalog.nombre, ${alias}.categoria)`)} = ${this.normalizedSql(categoryParam)})`;
  }

  private normalizedSql(expression: string) {
    return `lower(translate(regexp_replace(trim(${expression}::text), '\\s+', ' ', 'g'), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))`;
  }

  private localitySelect(extraSelect?: string) {
    return `SELECT l.id, l.nombre AS name, l.tipo_localidad AS type,
                   co.nombre AS "cantonName", p.nombre AS "provinceName"
                   ${extraSelect ? `, ${extraSelect}` : ""}
              FROM localidades l
              JOIN cantones co ON co.id = l.canton_id
              JOIN provincias p ON p.id = co.provincia_id`;
  }

  private nearbyResponse(
    items: ReturnType<EstablishmentsService["toPublicItem"]>[],
    locality: LocalityRow | null,
    fallbackApplied: boolean,
    requestedLocalityName: string | null,
  ) {
    return {
      items,
      fallbackApplied,
      requestedLocalityName,
      effectiveLocality: locality
        ? {
            name: locality.name,
            type: locality.type,
            cantonName: locality.cantonName,
            provinceName: locality.provinceName,
            distanceMeters: this.toNullableNumber(locality.distanceMeters),
          }
        : null,
    };
  }

  private async audit(
    manager: EntityManager,
    establishmentId: number,
    actorId: number,
    action: "CREAR" | "MODIFICAR" | "ACTIVAR" | "DESACTIVAR",
    previous: AdminEstablishmentItem | null,
    next: AdminEstablishmentItem | null,
  ) {
    await manager.query(
      `INSERT INTO auditoria_catalogos
        (usuario_id, catalogo_codigo, registro_id, accion, datos_anteriores, datos_nuevos)
       VALUES ($1, 'ESTABLISHMENT', $2, $3, $4::jsonb, $5::jsonb)`,
      [
        actorId,
        establishmentId,
        action,
        JSON.stringify(previous ? this.auditData(previous) : {}),
        JSON.stringify(next ? this.auditData(next) : {}),
      ],
    );
  }

  private auditData(item: AdminEstablishmentItem) {
    return {
      localityId: item.localityId,
      numeroRegistro: item.numeroRegistro,
      ruc: item.ruc,
      nombreComercial: item.nombreComercial,
      razonSocial: item.razonSocial,
      actividad: item.actividad,
      activityId: item.activityId,
      clasificacion: item.clasificacion,
      classificationId: item.classificationId,
      categoria: item.categoria,
      categoryId: item.categoryId,
      direccion: item.direccion,
      telefono: item.telefono,
      latitude: item.latitude,
      longitude: item.longitude,
      active: item.active,
    };
  }

  private toAdminItem(row: EstablishmentRow): AdminEstablishmentItem {
    return {
      id: Number(row.id),
      localityId: Number(row.localityId),
      localityName: row.localityName,
      localityType: row.localityType,
      cantonName: row.cantonName,
      provinceName: row.provinceName,
      numeroRegistro: row.numeroRegistro,
      ruc: row.ruc,
      nombreComercial: row.nombreComercial,
      razonSocial: row.razonSocial,
      actividad: row.actividad,
      clasificacion: row.clasificacion,
      categoria: row.categoria,
      activityId: this.toNullableInteger(row.activityId),
      classificationId: this.toNullableInteger(row.classificationId),
      categoryId: this.toNullableInteger(row.categoryId),
      direccion: row.direccion,
      telefono: row.telefono,
      latitude: this.toNullableNumber(row.latitude),
      longitude: this.toNullableNumber(row.longitude),
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublicItem(row: EstablishmentRow) {
    return {
      nombreComercial: row.nombreComercial,
      actividad: row.actividad,
      clasificacion: row.clasificacion,
      categoria: row.categoria,
      direccion: row.direccion,
      telefono: row.telefono,
      latitude: this.toNullableNumber(row.latitude),
      longitude: this.toNullableNumber(row.longitude),
      distanceMeters: this.toNullableNumber(row.distanceMeters),
      localityName: row.localityName,
    };
  }

  private toNullableNumber(
    value: string | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private toNullableInteger(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : null;
  }

  private normalizedValue(value: string | null | undefined) {
    return (value ?? "")
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  private parseId(value: string) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(
        "El identificador del establecimiento no es válido.",
      );
    }
    return id;
  }
}
