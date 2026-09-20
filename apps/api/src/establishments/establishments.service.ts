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
         e.actividad,
         e.clasificacion,
         e.categoria,
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
    JOIN provincias p ON p.id = co.provincia_id`;

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
      where.push(`e.actividad ILIKE ${add(`%${query.activity}%`)}`);
    if (query.classification)
      where.push(`e.clasificacion ILIKE ${add(`%${query.classification}%`)}`);
    if (query.category)
      where.push(`e.categoria ILIKE ${add(`%${query.category}%`)}`);
    if (query.q) {
      const term = add(`%${query.q}%`);
      where.push(
        `(e.nombre_comercial ILIKE ${term} OR e.numero_registro ILIKE ${term} OR e.actividad ILIKE ${term} OR e.direccion ILIKE ${term})`,
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

  async create(actorId: number, input: SaveEstablishmentDto) {
    void actorId;
    const required = this.requireCreateFields(input);
    return this.dataSource.transaction(async (manager) => {
      await this.assertLocality(manager, required.localityId);
      await this.assertUniqueRegistration(manager, input.numeroRegistro);
      const row = await this.insert(manager, input, required);
      return this.findWithManager(manager, row.id);
    });
  }

  async save(id: string, actorId: number, input: SaveEstablishmentDto) {
    void actorId;
    const numericId = this.parseId(id);
    return this.dataSource.transaction(async (manager) => {
      const current = await this.findWithManager(manager, numericId);
      const nextLocalityId = input.localityId ?? Number(current.localityId);
      const nextLatitude =
        input.latitude ?? this.toNullableNumber(current.latitude);
      const nextLongitude =
        input.longitude ?? this.toNullableNumber(current.longitude);
      if ((nextLatitude === null) !== (nextLongitude === null)) {
        throw new BadRequestException(
          "La latitud y la longitud deben enviarse juntas o dejarse vacías.",
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
        input.actividad?.trim() || current.actividad,
        input.clasificacion !== undefined
          ? input.clasificacion || null
          : current.clasificacion,
        input.categoria !== undefined
          ? input.categoria || null
          : current.categoria,
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
                direccion = $9,
                telefono = $10,
                latitud = $11,
                longitud = $12,
                ubicacion = CASE WHEN $11::numeric IS NULL OR $12::numeric IS NULL
                                 THEN NULL
                                 ELSE ST_SetSRID(ST_MakePoint($12::double precision, $11::double precision), 4326)::geography
                            END,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $13`,
        values,
      );
      return this.findWithManager(manager, numericId);
    });
  }

  async setActive(id: string, actorId: number, active: boolean) {
    void actorId;
    const numericId = this.parseId(id);
    const result = await this.dataSource.query(
      `UPDATE establecimientos_turisticos
          SET activo = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      RETURNING id`,
      [active, numericId],
    );
    if (!result[0])
      throw new NotFoundException("No se encontró el establecimiento.");
    return this.find(String(numericId));
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

  private async findWithManager(manager: EntityManager, id: string | number) {
    const rows = (await manager.query(
      `${establishmentSelect} ${establishmentJoin} WHERE e.id = $1`,
      [id],
    )) as EstablishmentRow[];
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró el establecimiento.");
    return this.toAdminItem(row);
  }

  private async insert(
    manager: EntityManager,
    input: SaveEstablishmentDto,
    required: {
      localityId: number;
      nombreComercial: string;
      actividad: string;
    },
  ) {
    const latitude = input.latitude ?? null;
    const longitude = input.longitude ?? null;
    if ((latitude === null) !== (longitude === null)) {
      throw new BadRequestException(
        "La latitud y la longitud deben enviarse juntas o dejarse vacías.",
      );
    }
    const rows = (await manager.query(
      `INSERT INTO establecimientos_turisticos (
         localidad_id, numero_registro, ruc, nombre_comercial, razon_social,
         actividad, clasificacion, categoria, direccion, telefono,
         latitud, longitud, ubicacion, activo, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         CASE WHEN $11::numeric IS NULL OR $12::numeric IS NULL THEN NULL
              ELSE ST_SetSRID(ST_MakePoint($12::double precision, $11::double precision), 4326)::geography END,
         TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       ) RETURNING id`,
      [
        required.localityId,
        input.numeroRegistro || null,
        input.ruc || null,
        required.nombreComercial,
        input.razonSocial || null,
        required.actividad,
        input.clasificacion || null,
        input.categoria || null,
        input.direccion || null,
        input.telefono || null,
        latitude,
        longitude,
      ],
    )) as Array<{ id: string }>;
    return rows[0];
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

  private requireCreateFields(input: SaveEstablishmentDto) {
    if (
      !input.localityId ||
      !input.nombreComercial?.trim() ||
      !input.actividad?.trim()
    ) {
      throw new BadRequestException(
        "La localidad, el nombre comercial y la actividad son obligatorios.",
      );
    }
    return {
      localityId: input.localityId,
      nombreComercial: input.nombreComercial.trim(),
      actividad: input.actividad.trim(),
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
       WHERE e_match.localidad_id = l.id
         AND e_match.activo = TRUE
         AND ${this.normalizedSql("e_match.actividad")} = ${this.normalizedSql(activityParam)}
         AND (${categoryParam}::text IS NULL OR ${this.normalizedSql("e_match.categoria")} = ${this.normalizedSql(categoryParam)})`;
  }

  private matchingActivitySql(
    alias: string,
    activityParam: string,
    categoryParam: string,
  ) {
    return `${this.normalizedSql(`${alias}.actividad`)} = ${this.normalizedSql(activityParam)}
            AND (${categoryParam}::text IS NULL OR ${this.normalizedSql(`${alias}.categoria`)} = ${this.normalizedSql(categoryParam)})`;
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

  private toAdminItem(row: EstablishmentRow) {
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
