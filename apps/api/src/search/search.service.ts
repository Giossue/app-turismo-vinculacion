import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type { PublicSearchQueryDto } from "./search.dto";
import { PhotonClient } from "./infrastructure/photon.client";

type SearchItem = Readonly<{
  kind: "center" | "establishment" | "geographic";
  source: "internal" | "photon";
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
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
};

type EstablishmentSearchRow = {
  title: string;
  subtitle: string;
  latitude: string | number;
  longitude: string | number;
  approximate: boolean;
  icon: string;
  color: string;
};

@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly photon: PhotonClient,
  ) {}

  async search(query: PublicSearchQueryDto) {
    const text = query.q.trim();
    const [centers, establishments, geographic] = await Promise.all([
      this.searchCenters(text),
      this.searchEstablishments(text),
      this.photon.search(text, query),
    ]);

    const internal: SearchItem[] = [
      ...centers.map((row): SearchItem => ({
        kind: "center",
        source: "internal",
        title: row.title,
        subtitle: [row.category, row.type, row.cantonCode].filter(Boolean).join(" · "),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
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
      })),
      ...establishments.map((row): SearchItem => ({
        kind: "establishment",
        source: "internal",
        title: row.title,
        subtitle: row.subtitle,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        approximate: row.approximate,
        icon: row.icon,
        color: row.color,
      })),
    ];

    return {
      items: [
        ...internal,
        ...geographic.map(
          (place): SearchItem => ({
            kind: "geographic",
            source: "photon",
            title: place.title,
            subtitle: place.subtitle,
            latitude: place.latitude,
            longitude: place.longitude,
            type: place.type,
          }),
        ),
      ].slice(0, 24),
      meta: { photonAvailable: geographic.length > 0 },
    };
  }

  private searchCenters(query: string): Promise<CenterSearchRow[]> {
    return this.dataSource.query<CenterSearchRow[]>(
      `SELECT c.codigo_atractivo AS code,
              c.nombre AS title,
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
              rj.codigo AS "hierarchyCode"
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
          AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL
          AND (c.nombre ILIKE '%' || $1 || '%'
            OR COALESCE(c.descripcion, '') ILIKE '%' || $1 || '%'
            OR ca.nombre ILIKE '%' || $1 || '%'
            OR ta.nombre ILIKE '%' || $1 || '%'
            OR sa.nombre ILIKE '%' || $1 || '%')
        ORDER BY CASE WHEN lower(c.nombre) = lower($1) THEN 0 ELSE 1 END,
                 c.nombre, c.codigo_atractivo
        LIMIT 8`,
      [query],
    );
  }

  private searchEstablishments(query: string): Promise<EstablishmentSearchRow[]> {
    return this.dataSource.query<EstablishmentSearchRow[]>(
      `SELECT e.nombre_comercial AS title,
              CONCAT_WS(' · ',
                COALESCE(category_catalog.nombre, e.categoria),
                l.nombre,
                e.direccion
              ) AS subtitle,
              e.latitud AS latitude,
              e.longitud AS longitude,
              e.coordenadas_aproximadas AS approximate,
              COALESCE(NULLIF(classification_catalog.icono, 'mapPin'), NULLIF(category_catalog.icono, 'mapPin'), 'shop-supermarket') AS icon,
              COALESCE(classification_catalog.color, category_catalog.color, '#be123c') AS color
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
          AND (e.nombre_comercial ILIKE '%' || $1 || '%'
            OR COALESCE(e.actividad, '') ILIKE '%' || $1 || '%'
            OR COALESCE(activity_catalog.nombre, '') ILIKE '%' || $1 || '%'
            OR COALESCE(classification_catalog.nombre, '') ILIKE '%' || $1 || '%'
            OR COALESCE(category_catalog.nombre, '') ILIKE '%' || $1 || '%'
            OR COALESCE(e.direccion, '') ILIKE '%' || $1 || '%')
        ORDER BY e.nombre_comercial, e.id
        LIMIT 8`,
      [query],
    );
  }
}
