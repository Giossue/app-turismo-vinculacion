import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type {
  ListPublishedCentersQuery,
  NearbyPublishedCentersQuery,
  PublicCenterRepository,
} from "../application/public-center.repository";
import type {
  DiscoveryCatalog,
  NearbyPublicCenterPage,
  PublicCenter,
  PublicCenterDetail,
  PublicCenterPage,
} from "../domain/public-center";

type CenterRow = Record<string, string | null>;
type NearbyCenterRow = CenterRow & {
  distance_meters: string | number | null;
};

type DetailRow = CenterRow & {
  admission: PublicCenterDetail["admission"];
  activities: string[] | null;
  accessibility: string[] | null;
  facilities: string[] | null;
  photos: Array<{
    id: number;
    url: string;
    mimeType: string;
    description: string | null;
  }> | null;
};

@Injectable()
export class PostgresPublicCenterRepository implements PublicCenterRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listPublished(
    query: ListPublishedCentersQuery,
  ): Promise<PublicCenterPage> {
    const values = [
      query.text ?? null,
      query.bounds?.west ?? null,
      query.bounds?.south ?? null,
      query.bounds?.east ?? null,
      query.bounds?.north ?? null,
      query.categoryCode ?? null,
      query.typeCode ?? null,
      query.subtypeCode ?? null,
      query.provinceCode ?? null,
      query.cantonCode ?? null,
      query.parishCode ?? null,
      query.hierarchyCode ?? null,
      query.locality ?? null,
    ];
    const from = this.publishedCentersFromClause();
    const where = this.publishedCentersWhereClause();
    const [rows, counts] = await Promise.all([
      this.dataSource.query<CenterRow[]>(
        `SELECT ${this.publicFields()} ${from} ${where} ORDER BY ${this.searchRelevanceExpression()} DESC, c.nombre ASC, c.codigo_atractivo ASC LIMIT $14`,
        [...values, query.limit],
      ),
      this.dataSource.query<readonly { total: string }[]>(
        `SELECT COUNT(*)::text AS total ${from} ${where}`,
        values,
      ),
    ]);
    return {
      items: rows.map(mapPublicCenter),
      total: Number(counts[0]?.total ?? 0),
    };
  }

  async listNearbyPublished(
    query: NearbyPublishedCentersQuery,
  ): Promise<NearbyPublicCenterPage> {
    const origin = "ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography";
    const rows = await this.dataSource.query<NearbyCenterRow[]>(
      `SELECT ${this.publicFields()},
              ST_Distance(c.ubicacion, ${origin}) AS distance_meters
         ${this.publishedCentersFromClause()}
        WHERE c.activo = TRUE
          AND er.codigo = 'PUBLICADO'
          AND ST_DWithin(c.ubicacion, ${origin}, $3)
          AND (
            $4::text IS NULL
            OR c.nombre ILIKE '%' || $4 || '%'
            OR COALESCE(c.descripcion, '') ILIKE '%' || $4 || '%'
            OR ca.nombre ILIKE '%' || $4 || '%'
            OR ta.nombre ILIKE '%' || $4 || '%'
            OR sa.nombre ILIKE '%' || $4 || '%'
          )
        ORDER BY distance_meters, c.nombre, c.codigo_atractivo
        LIMIT $5`,
      [
        query.latitude,
        query.longitude,
        query.radiusMeters,
        query.category ?? null,
        query.limit,
      ],
    );

    return {
      items: rows.map((row) => ({
        ...mapPublicCenter(row),
        distanceMeters: Number(row.distance_meters),
      })),
    };
  }

  async findPublishedByCode(code: string): Promise<PublicCenterDetail | null> {
    const rows = await this.dataSource.query<DetailRow[]>(
      `SELECT ${this.publicFields()}, z.nombre AS tourist_zone,
        NULLIF(concat_ws(', ', c.calle_principal, c.numero_direccion, c.calle_transversal, c.barrio_sector_comuna), '') AS address,
        c.altitud_msnm AS altitude_meters,
        CASE WHEN ic.id IS NULL THEN NULL ELSE json_build_object('type', ti.nombre, 'attention', ma.nombre, 'opensAt', to_char(ic.hora_ingreso, 'HH24:MI'), 'closesAt', to_char(ic.hora_salida, 'HH24:MI'), 'priceFrom', ic.precio_desde, 'priceTo', ic.precio_hasta) END AS admission,
        COALESCE((SELECT array_agg(DISTINCT at.nombre ORDER BY at.nombre) FROM actividades_centro_turistico act JOIN actividades_turisticas at ON at.id = act.actividad_turistica_id WHERE act.centro_turistico_id = c.id), ARRAY[]::text[]) AS activities,
        COALESCE((SELECT array_agg(DISTINCT tac.nombre ORDER BY tac.nombre) FROM centro_accesibilidad_resumen acr JOIN tipos_accesibilidad tac ON tac.id = acr.tipo_accesibilidad_id WHERE acr.centro_turistico_id = c.id AND acr.aplica), ARRAY[]::text[]) AS accessibility,
        COALESCE((SELECT array_agg(DISTINCT tf.nombre ORDER BY tf.nombre) FROM facilidades_centro fc JOIN tipos_facilidad tf ON tf.id = fc.tipo_facilidad_id WHERE fc.centro_turistico_id = c.id), ARRAY[]::text[]) AS facilities,
        COALESCE((SELECT json_agg(json_build_object('id', a.id, 'url', '/api/v1/media/' || a.id, 'mimeType', a.mime_type, 'description', a.descripcion) ORDER BY a.orden NULLS LAST, a.id)
                    FROM archivos_centro_turistico a
                    JOIN tipos_archivo_centro_turistico t ON t.id = a.tipo_archivo_centro_id
                   WHERE a.centro_turistico_id = c.id AND a.estado = 'PUBLICADO' AND t.codigo = 'FOTOGRAFIA'), '[]'::json) AS photos
      ${this.publishedCentersFromClause()}
      LEFT JOIN zonas_turisticas z ON z.id = c.zona_turistica_id
      LEFT JOIN ingresos_centro_turistico ic ON ic.centro_turistico_id = c.id
      LEFT JOIN tipos_ingreso ti ON ti.id = ic.tipo_ingreso_id
      LEFT JOIN modalidades_atencion ma ON ma.id = ic.modalidad_atencion_id
      WHERE c.activo AND er.codigo = 'PUBLICADO' AND c.codigo_atractivo = $1 LIMIT 1`,
      [code],
    );
    return rows[0] ? mapPublicCenterDetail(rows[0]) : null;
  }

  async getDiscoveryCatalog(): Promise<DiscoveryCatalog> {
    const [
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      hierarchies,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT codigo AS code, nombre AS name FROM categorias_atractivo WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT ta.codigo AS code, ta.nombre AS name, ca.codigo AS "categoryCode" FROM tipos_atractivo ta JOIN categorias_atractivo ca ON ca.id = ta.categoria_id WHERE ta.activo AND ca.activo ORDER BY ta.nombre`,
      ),
      this.dataSource.query(
        `SELECT sa.codigo AS code, sa.nombre AS name, ta.codigo AS "typeCode" FROM subtipos_atractivo sa JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id WHERE sa.activo AND ta.activo ORDER BY sa.nombre`,
      ),
      this.dataSource.query(
        `SELECT codigo_dpa AS code, nombre AS name FROM provincias WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT c.codigo_cton AS code, c.nombre AS name, p.codigo_dpa AS "provinceCode" FROM cantones c JOIN provincias p ON p.id = c.provincia_id WHERE c.activo AND p.activo ORDER BY c.nombre`,
      ),
      this.dataSource.query(
        `SELECT q.codigo_pqa AS code, q.nombre AS name, c.codigo_cton AS "cantonCode" FROM parroquias q JOIN cantones c ON c.id = q.canton_id WHERE q.activo AND c.activo ORDER BY q.nombre`,
      ),
      this.dataSource.query(
        `SELECT codigo AS code, nombre AS name FROM rangos_jerarquia WHERE activo ORDER BY codigo`,
      ),
    ]);
    return {
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      hierarchies,
    };
  }

  private publicFields(): string {
    return `c.codigo_atractivo AS code, c.nombre AS name, c.descripcion AS description, c.latitud AS latitude, c.longitud AS longitude, ca.nombre AS category, ta.nombre AS type, sa.nombre AS subtype, rj.nombre AS hierarchy, ca.codigo AS category_code, ta.codigo AS type_code, sa.codigo AS subtype_code, p.codigo_dpa AS province_code, ct.codigo_cton AS canton_code, pa.codigo_pqa AS parish_code, rj.codigo AS hierarchy_code`;
  }

  private publishedCentersFromClause(): string {
    return `FROM centros_turisticos c JOIN estados_resenia er ON er.id = c.estado_resenia_id JOIN subtipos_atractivo sa ON sa.id = c.subtipo_atractivo_id JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id JOIN categorias_atractivo ca ON ca.id = ta.categoria_id JOIN parroquias pa ON pa.id = c.parroquia_id JOIN cantones ct ON ct.id = pa.canton_id JOIN provincias p ON p.id = ct.provincia_id LEFT JOIN rangos_jerarquia rj ON rj.id = c.jerarquia_id`;
  }

  private publishedCentersWhereClause(): string {
    return `WHERE c.activo AND er.codigo = 'PUBLICADO'
      AND ($1::text IS NULL OR c.nombre % $1 OR c.nombre ILIKE '%' || $1 || '%'
        OR COALESCE(c.descripcion, '') ILIKE '%' || $1 || '%'
        OR ca.nombre ILIKE '%' || $1 || '%'
        OR ta.nombre ILIKE '%' || $1 || '%'
        OR sa.nombre ILIKE '%' || $1 || '%')
      AND ($2::double precision IS NULL OR (c.ubicacion && ST_MakeEnvelope($2, $3, $4, $5, 4326)::geography AND ST_Intersects(c.ubicacion, ST_MakeEnvelope($2, $3, $4, $5, 4326)::geography)))
      AND ($6::text IS NULL OR ca.codigo = $6) AND ($7::text IS NULL OR ta.codigo = $7)
      AND ($8::text IS NULL OR sa.codigo = $8) AND ($9::text IS NULL OR p.codigo_dpa = $9)
      AND ($10::text IS NULL OR ct.codigo_cton = $10) AND ($11::text IS NULL OR pa.codigo_pqa = $11)
      AND ($12::text IS NULL OR rj.codigo = $12)
      AND ($13::text IS NULL OR p.nombre ILIKE $13 OR ct.nombre ILIKE $13 OR pa.nombre ILIKE $13)`;
  }

  private searchRelevanceExpression(): string {
    return `GREATEST(
      COALESCE(similarity(c.nombre, COALESCE($1::text, '')), 0),
      COALESCE(similarity(c.descripcion, COALESCE($1::text, '')), 0),
      COALESCE(similarity(ca.nombre, COALESCE($1::text, '')), 0),
      COALESCE(similarity(ta.nombre, COALESCE($1::text, '')), 0),
      COALESCE(similarity(sa.nombre, COALESCE($1::text, '')), 0)
    )`;
  }
}

function mapPublicCenter(row: CenterRow): PublicCenter {
  return {
    code: required(row, "code"),
    name: required(row, "name"),
    description: row.description,
    latitude: Number(required(row, "latitude")),
    longitude: Number(required(row, "longitude")),
    category: required(row, "category"),
    type: required(row, "type"),
    subtype: required(row, "subtype"),
    hierarchy: row.hierarchy,
    categoryCode: required(row, "category_code"),
    typeCode: required(row, "type_code"),
    subtypeCode: required(row, "subtype_code"),
    provinceCode: required(row, "province_code"),
    cantonCode: required(row, "canton_code"),
    parishCode: required(row, "parish_code"),
    hierarchyCode: row.hierarchy_code,
  };
}

function mapPublicCenterDetail(row: DetailRow): PublicCenterDetail {
  return {
    ...mapPublicCenter(row),
    touristZone: required(row, "tourist_zone"),
    address: row.address,
    altitudeMeters:
      row.altitude_meters === null ? null : Number(row.altitude_meters),
    admission: row.admission,
    activities: row.activities ?? [],
    accessibility: row.accessibility ?? [],
    facilities: row.facilities ?? [],
    photos: row.photos ?? [],
  };
}

function required(row: CenterRow, key: string): string {
  const value = row[key];
  if (value === null || value === undefined)
    throw new Error(`Dato público incompleto: ${key}`);
  return value;
}
