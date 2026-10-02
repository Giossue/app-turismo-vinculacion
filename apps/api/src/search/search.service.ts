import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type { PublicSearchQueryDto } from "./search.dto";
import { PhotonClient } from "./infrastructure/photon.client";
import {
  distanceFromOrigin,
  normalizeSearchText,
  searchTerms,
  textualRelevance,
  withinBounds,
} from "./search-ranking";

type SearchItem = Readonly<{
  kind: "center" | "establishment" | "geographic";
  source: "internal" | "photon";
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  centerCode?: string;
  category?: string | null;
  type?: string | null;
  subtype?: string | null;
  hierarchy?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  subtypeCode?: string | null;
  provinceCode?: string | null;
  cantonCode?: string | null;
  parishCode?: string | null;
  hierarchyCode?: string | null;
  approximate?: boolean;
  icon?: string;
  color?: string;
}>;

type CenterSearchRow = {
  code: string;
  title: string;
  description: string | null;
  latitude: string | number;
  longitude: string | number;
  category: string;
  type: string;
  subtype: string;
  hierarchy: string | null;
  categoryCode: string;
  typeCode: string;
  subtypeCode: string;
  provinceCode: string;
  cantonCode: string;
  parishCode: string;
  hierarchyCode: string | null;
  subtitle: string;
  relevance: number;
  distanceMeters: number | null;
};

type EstablishmentSearchRow = {
  title: string;
  subtitle: string;
  latitude: string | number;
  longitude: string | number;
  approximate: boolean;
  icon: string;
  color: string;
  relevance: number;
  distanceMeters: number | null;
};

@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly photon: PhotonClient,
  ) {}

  async search(query: PublicSearchQueryDto) {
    const text = normalizeSearchText(query.q);
    if (!text) return { items: [], meta: { photonAvailable: false } };
    const terms = searchTerms(text);
    const [centers, establishments, geographic] = await Promise.all([
      !query.kind || query.kind === "center"
        ? this.searchCenters(query, text, terms)
        : Promise.resolve([]),
      !query.kind || query.kind === "establishment"
        ? this.searchEstablishments(query, text, terms)
        : Promise.resolve([]),
      !query.kind || query.kind === "geographic"
        ? this.photon.search(query.q.trim(), query)
        : Promise.resolve([]),
    ]);

    const candidates: Array<{ item: SearchItem; relevance: number }> = [
      ...centers.map((row) => ({
        relevance: Number(row.relevance),
        item: {
          kind: "center" as const,
          source: "internal" as const,
          title: row.title,
          subtitle: row.subtitle,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          distanceMeters: distanceFromOrigin(
            Number(row.latitude),
            Number(row.longitude),
            query,
          ),
          centerCode: row.code,
          category: row.category,
          type: row.type,
          subtype: row.subtype,
          hierarchy: row.hierarchy,
          categoryCode: row.categoryCode,
          typeCode: row.typeCode,
          subtypeCode: row.subtypeCode,
          provinceCode: row.provinceCode,
          cantonCode: row.cantonCode,
          parishCode: row.parishCode,
          hierarchyCode: row.hierarchyCode,
        },
      })),
      ...establishments.map((row) => ({
        relevance: Number(row.relevance),
        item: {
          kind: "establishment" as const,
          source: "internal" as const,
          title: row.title,
          subtitle: row.subtitle,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          distanceMeters: distanceFromOrigin(
            Number(row.latitude),
            Number(row.longitude),
            query,
          ),
          approximate: row.approximate,
          icon: row.icon,
          color: row.color,
        },
      })),
      ...geographic.map((place) => ({
        relevance: textualRelevance(text, place.title, place.subtitle, terms),
        item: {
          kind: "geographic" as const,
          source: "photon" as const,
          title: place.title,
          subtitle: place.subtitle,
          latitude: place.latitude,
          longitude: place.longitude,
          distanceMeters: distanceFromOrigin(
            place.latitude,
            place.longitude,
            query,
          ),
          type: place.type,
        },
      })),
    ];

    // No source owns a fixed block of the list. Exactness wins over proximity;
    // equally relevant matches are compared by their distance to the focus point.
    candidates.sort(
      (left, right) =>
        right.relevance - left.relevance ||
        (left.item.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
          (right.item.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    );
    const seen = new Set<string>();
    const items = candidates
      .flatMap(({ item, relevance }) => {
        if (!withinBounds(item.latitude, item.longitude, query)) return [];
        const identity = `${normalizeSearchText(item.title)}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
        if (seen.has(identity)) return [];
        seen.add(identity);
        return [{ ...item, relevance }];
      })
      .slice(0, 24);

    return { items, meta: { photonAvailable: geographic.length > 0 } };
  }

  private searchCenters(
    query: PublicSearchQueryDto,
    text: string,
    terms: readonly string[],
  ): Promise<CenterSearchRow[]> {
    return this.dataSource.query<CenterSearchRow[]>(
      `SELECT c.codigo_atractivo AS code,
              c.nombre AS title,
              CONCAT_WS(' · ', ca.nombre, ta.nombre, ct.nombre) AS subtitle,
              c.descripcion AS description,
              c.latitud AS latitude,
              c.longitud AS longitude,
              ca.nombre AS category,
              ta.nombre AS type,
              sa.nombre AS subtype,
              rj.nombre AS hierarchy,
              ca.codigo AS "categoryCode",
              ta.codigo AS "typeCode",
              sa.codigo AS "subtypeCode",
              p.codigo_dpa AS "provinceCode",
              ct.codigo_cton AS "cantonCode",
              pa.codigo_pqa AS "parishCode",
              rj.codigo AS "hierarchyCode",
              ${rankingSql("c.nombre", "CONCAT_WS(' ', c.descripcion, ca.nombre, ta.nombre, sa.nombre, pa.nombre, ct.nombre, p.nombre)")} AS relevance,
              ${distanceSql("c")} AS "distanceMeters"
         FROM centros_turisticos c
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
         JOIN subtipos_atractivo sa ON sa.id = c.subtipo_atractivo_id
         JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
         JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
         JOIN parroquias pa ON pa.id = c.parroquia_id
         JOIN cantones ct ON ct.id = pa.canton_id
         JOIN provincias p ON p.id = ct.provincia_id
         LEFT JOIN rangos_jerarquia rj ON rj.id = c.jerarquia_id
        WHERE c.activo AND er.codigo = 'PUBLICADO'
          AND c.codigo_atractivo IS NOT NULL
          AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL
          AND ${boundsSql("c")}
          AND ${matchingSql("c.nombre", "CONCAT_WS(' ', c.descripcion, ca.nombre, ta.nombre, sa.nombre, pa.nombre, ct.nombre, p.nombre)")}
        ORDER BY relevance DESC, "distanceMeters" ASC NULLS LAST,
                 c.nombre, c.codigo_atractivo
        LIMIT 48`,
      searchParameters(query, text, terms),
    );
  }

  private searchEstablishments(
    query: PublicSearchQueryDto,
    text: string,
    terms: readonly string[],
  ): Promise<EstablishmentSearchRow[]> {
    const details =
      "CONCAT_WS(' ', e.actividad, e.clasificacion, e.categoria, activity_catalog.nombre, classification_catalog.nombre, category_catalog.nombre, e.direccion, l.nombre, co.nombre, p.nombre)";
    return this.dataSource.query<EstablishmentSearchRow[]>(
      `SELECT e.nombre_comercial AS title,
              CONCAT_WS(' · ',
                COALESCE(classification_catalog.nombre, category_catalog.nombre, e.categoria),
                l.nombre,
                e.direccion
              ) AS subtitle,
              e.latitud AS latitude,
              e.longitud AS longitude,
              e.coordenadas_aproximadas AS approximate,
              COALESCE(NULLIF(classification_catalog.icono, 'mapPin'), NULLIF(category_catalog.icono, 'mapPin'), 'shop-supermarket') AS icon,
              COALESCE(classification_catalog.color, category_catalog.color, '#be123c') AS color,
              ${rankingSql("e.nombre_comercial", details)} AS relevance,
              ${distanceSql("e")} AS "distanceMeters"
         FROM establecimientos_turisticos e
         JOIN localidades l ON l.id = e.localidad_id
         JOIN cantones co ON co.id = l.canton_id
         JOIN provincias p ON p.id = co.provincia_id
         LEFT JOIN catalogo_catastro_actividades activity_catalog
           ON activity_catalog.id = e.actividad_catalogo_id
         LEFT JOIN catalogo_catastro_clasificaciones classification_catalog
           ON classification_catalog.id = e.clasificacion_catalogo_id
         LEFT JOIN catalogo_catastro_categorias category_catalog
           ON category_catalog.id = e.categoria_catalogo_id
        WHERE e.activo AND e.estado_revision = 'PUBLICADO'
          AND l.activo AND co.activo AND p.activo
          AND e.latitud IS NOT NULL AND e.longitud IS NOT NULL
          AND ${boundsSql("e")}
          AND ${matchingSql("e.nombre_comercial", details)}
        ORDER BY relevance DESC, "distanceMeters" ASC NULLS LAST,
                 e.nombre_comercial, e.id
        LIMIT 48`,
      searchParameters(query, text, terms),
    );
  }
}

// These expressions contain only source-controlled identifiers. User input is
// always bound as a parameter, including aliases and every map coordinate.
export function normalizedSearchSql(value: string): string {
  return String.raw`btrim(regexp_replace(
    lower(regexp_replace(normalize(${value}, NFD), U&'[\0300-\036f]', '', 'g') COLLATE "C"),
    '[^a-z0-9]+', ' ', 'g'
  ))`;
}

function matchingSql(title: string, details: string): string {
  // Taxonomy and description matches require scanning joined public rows. The
  // disposable EXPLAIN fixture records this limit; no extra index is claimed to
  // accelerate the complete OR expression without measured evidence.
  return `(${normalizedSearchSql(title)} LIKE '%' || $1 || '%'
    OR (length($1) >= 4 AND $1 <% ${normalizedSearchSql(title)})
    OR EXISTS (SELECT 1 FROM unnest($2::text[]) term
      WHERE ${normalizedSearchSql(title)} LIKE '%' || term || '%'
         OR ${normalizedSearchSql(details)} LIKE '%' || term || '%')
    OR (length($1) >= 4 AND $1 <% ${normalizedSearchSql(details)}))`;
}

function rankingSql(title: string, details: string): string {
  return `CASE
    WHEN ${normalizedSearchSql(title)} = $1 THEN 600
    WHEN ${normalizedSearchSql(title)} LIKE $1 || '%' THEN 500
    WHEN ${normalizedSearchSql(title)} LIKE '%' || $1 || '%' THEN 400
    WHEN EXISTS (SELECT 1 FROM unnest($2::text[]) term
      WHERE ${normalizedSearchSql(title)} LIKE '%' || term || '%') THEN 300
    WHEN EXISTS (SELECT 1 FROM unnest($2::text[]) term
      WHERE ${normalizedSearchSql(details)} LIKE '%' || term || '%') THEN 200
    ELSE 100 + floor(50 * greatest(
      word_similarity($1, ${normalizedSearchSql(title)}),
      word_similarity($1, ${normalizedSearchSql(details)})))
  END`;
}

function distanceSql(table: string): string {
  return `CASE WHEN $3::double precision IS NOT NULL AND $4::double precision IS NOT NULL
    THEN ST_Distance(${table}.ubicacion,
      ST_SetSRID(ST_MakePoint($4::double precision, $3::double precision), 4326)::geography, false)
    ELSE NULL END`;
}

function boundsSql(table: string): string {
  return `($5::double precision IS NULL OR (
    ${table}.longitud BETWEEN $5::double precision AND $7::double precision
    AND ${table}.latitud BETWEEN $6::double precision AND $8::double precision))`;
}

function searchParameters(
  query: PublicSearchQueryDto,
  text: string,
  terms: readonly string[],
) {
  return [
    text,
    terms,
    query.latitude ?? null,
    query.longitude ?? null,
    query.west ?? null,
    query.south ?? null,
    query.east ?? null,
    query.north ?? null,
  ];
}
