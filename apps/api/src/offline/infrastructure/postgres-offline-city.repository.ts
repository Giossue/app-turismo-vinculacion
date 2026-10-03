import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import { createHash } from "node:crypto";

import type {
  OfflineCity,
  OfflineCityManifest,
  OfflineGeoJson,
  OfflineGeoJsonLineString,
  OfflineManifestCenter,
  OfflineManifestEstablishment,
  OfflineManifestPoi,
  OfflineManifestRoute,
} from "../domain/offline-city";
import { getOfflineCityBounds } from "../domain/offline-city-bounds";
import type { OfflineCityRepository } from "../application/offline-city.repository";
import { estimateRouteDurationMinutes } from "../../transport/domain/estimated-route-duration";
import { buildOfflineEstablishmentQuery } from "./offline-establishment-query";

type CityRow = {
  id: string;
  name: string;
  canton: string;
  province: string;
  latitude: string | null;
  longitude: string | null;
  package_version: number | null;
  package_checksum: string | null;
  package_zoom_min: number | null;
  package_zoom_max: number | null;
  package_published_at: Date | null;
};

type CenterRow = OfflineManifestCenter;
type RouteRow = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  duration_minutes: number | string | null;
  distance_meters: number | string | null;
  transport_code: string | null;
  geometry: OfflineGeoJsonLineString;
  directions: unknown;
};
type PoiRow = Omit<OfflineManifestPoi, "key" | "category" | "icon"> & {
  id: string;
};

@Injectable()
export class PostgresOfflineCityRepository implements OfflineCityRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listCities(): Promise<readonly OfflineCity[]> {
    const rows = await this.dataSource.query<CityRow[]>(cityQuery());
    return rows.map(mapCity);
  }

  async getManifest(slug: string): Promise<OfflineCityManifest | null> {
    const rows = await this.dataSource.query<CityRow[]>(cityQuery());
    const cityRow = rows.find((row) => citySlug(row) === slug);
    if (!cityRow || cityRow.package_version === null) return null;

    const boundaryRows = await this.dataSource.query<
      readonly { boundary: OfflineGeoJson | null }[]
    >(
      `SELECT ST_AsGeoJSON(limite.geometria)::jsonb AS boundary
         FROM localidad_limites_oficiales limite
         WHERE limite.localidad_id = $1 AND limite.vigente
         ORDER BY limite.version DESC LIMIT 1`,
      [cityRow.id],
    );
    const city = mapCity(cityRow);
    const boundary = boundaryRows[0]?.boundary ?? null;
    const bounds = getOfflineCityBounds(boundary, city);
    const establishmentsQuery = buildOfflineEstablishmentQuery(
      boundary,
      bounds,
    );

    const [centers, routes, establishments, pois] = await Promise.all([
      this.dataSource.query<CenterRow[]>(
        `SELECT c.codigo_atractivo AS code, c.nombre AS name,
          c.descripcion AS description, c.latitud::double precision AS latitude,
          c.longitud::double precision AS longitude, ca.nombre AS category,
          ta.nombre AS type, sa.nombre AS subtype, rj.nombre AS hierarchy,
          ca.codigo AS "categoryCode", ta.codigo AS "typeCode",
          sa.codigo AS "subtypeCode", p.codigo_dpa AS "provinceCode",
          ct.codigo_cton AS "cantonCode", pa.codigo_pqa AS "parishCode",
          rj.codigo AS "hierarchyCode"
         FROM centros_turisticos c
         JOIN zonas_turisticas z ON z.id = c.zona_turistica_id
         JOIN subtipos_atractivo sa ON sa.id = c.subtipo_atractivo_id
         JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
         JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
         JOIN parroquias pa ON pa.id = c.parroquia_id
         JOIN cantones ct ON ct.id = pa.canton_id
         JOIN provincias p ON p.id = ct.provincia_id
         LEFT JOIN rangos_jerarquia rj ON rj.id = c.jerarquia_id
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
         WHERE c.activo AND z.activo AND er.codigo = 'PUBLICADO'
           AND z.localidad_id = $1
         ORDER BY c.nombre, c.codigo_atractivo`,
        [cityRow.id],
      ),
      this.dataSource.query<RouteRow[]>(
        `SELECT DISTINCT ON (rt.id) rt.id::text AS id,
          rt.nombre AS name, rt.origen AS origin,
          rt.destino AS destination,
          EXTRACT(EPOCH FROM rt.duracion_estimada) / 60 AS duration_minutes,
          ST_Length(version.geometria) AS distance_meters,
          tipo.codigo AS transport_code,
          ST_AsGeoJSON(version.geometria)::jsonb AS geometry,
          version.indicaciones AS directions
         FROM rutas_transporte rt
         JOIN tipos_transporte tipo ON tipo.id = rt.tipo_transporte_id
         JOIN rutas_transporte_versiones version
           ON version.ruta_transporte_id = rt.id
          AND version.estado = 'PUBLICADA'
         JOIN centro_rutas_transporte crt ON crt.ruta_transporte_id = rt.id
         JOIN centros_turisticos c ON c.id = crt.centro_turistico_id
         JOIN zonas_turisticas z ON z.id = c.zona_turistica_id
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
         WHERE rt.activo AND c.activo AND z.activo AND er.codigo = 'PUBLICADO'
           AND z.localidad_id = $1
         ORDER BY rt.id, version.version DESC`,
        [cityRow.id],
      ),
      this.dataSource.query<OfflineManifestEstablishment[]>(
        establishmentsQuery.sql,
        establishmentsQuery.params,
      ),
      this.dataSource.query<PoiRow[]>(
        `WITH area AS (
          SELECT COALESCE(
            ST_GeomFromGeoJSON($2::jsonb),
            ST_MakeEnvelope($3, $4, $5, $6, 4326)
          )::geography AS geometry
        )
        SELECT pi.id::text AS id, pi.nombre AS name,
               pi.descripcion AS description,
               ST_Y(pi.ubicacion::geometry) AS latitude,
               ST_X(pi.ubicacion::geometry) AS longitude
          FROM puntos_interes pi
          JOIN zonas_turisticas z ON z.id = pi.zona_turistica_id
          JOIN localidades l ON l.id = z.localidad_id
          JOIN cantones co ON co.id = l.canton_id
          JOIN provincias p ON p.id = co.provincia_id
          CROSS JOIN area
         WHERE pi.activo = TRUE AND z.activo = TRUE
           AND l.activo AND co.activo AND p.activo
           AND z.localidad_id = $1
           AND ST_Covers(area.geometry, pi.ubicacion)
         ORDER BY pi.nombre, pi.id`,
        [cityRow.id, boundary, ...bounds],
      ),
    ]);

    return {
      city,
      package: {
        version: cityRow.package_version,
        checksumSha256: cityRow.package_checksum,
        zoomMin: cityRow.package_zoom_min ?? 8,
        zoomMax: cityRow.package_zoom_max ?? 17,
        publishedAt: cityRow.package_published_at?.toISOString() ?? null,
      },
      boundary,
      bounds,
      centers,
      establishments: establishments.map(mapEstablishment),
      pois: pois.map(mapPoi),
      routes: routes.map(mapRoute),
    };
  }
}

/**
 * A city is downloadable as soon as it has published content: no manual
 * package is needed. The version is the last change (in seconds) to any of
 * its zones, centers, points of interest, establishments or transport routes
 * and their versions, including unpublishing or logical deletion, which also
 * touch `updated_at`; it only grows, so the app can offer the update. A
 * manual `paquetes_offline_ciudad` row remains optional to set zoom levels.
 */
function cityQuery(): string {
  return `SELECT l.id::text AS id, l.nombre AS name, c.nombre AS canton,
    p.nombre AS province, l.latitud AS latitude, l.longitud AS longitude,
    CASE
      WHEN paquete.id IS NOT NULL OR centers.published OR pois.published
        OR establishments.published
      THEN COALESCE(
        FLOOR(EXTRACT(EPOCH FROM content.changed_at))::integer,
        paquete.version
      )
    END AS package_version,
    paquete.checksum_sha256 AS package_checksum,
    paquete.zoom_min AS package_zoom_min,
    paquete.zoom_max AS package_zoom_max,
    COALESCE(content.changed_at, paquete.publicado_at) AS package_published_at
  FROM localidades l
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  LEFT JOIN paquetes_offline_ciudad paquete
    ON paquete.localidad_id = l.id AND paquete.estado = 'PUBLICADO'
  CROSS JOIN LATERAL (
    SELECT MAX(z.updated_at) AS changed_at
      FROM zonas_turisticas z
     WHERE z.localidad_id = l.id
  ) zones
  CROSS JOIN LATERAL (
    SELECT MAX(ct.updated_at) AS changed_at,
      COALESCE(BOOL_OR(ct.activo AND z.activo AND er.codigo = 'PUBLICADO'), FALSE)
        AS published
      FROM centros_turisticos ct
      JOIN zonas_turisticas z ON z.id = ct.zona_turistica_id
      JOIN estados_resenia er ON er.id = ct.estado_resenia_id
     WHERE z.localidad_id = l.id
  ) centers
  CROSS JOIN LATERAL (
    SELECT MAX(pi.updated_at) AS changed_at,
      COALESCE(BOOL_OR(pi.activo AND z.activo), FALSE) AS published
      FROM puntos_interes pi
      JOIN zonas_turisticas z ON z.id = pi.zona_turistica_id
     WHERE z.localidad_id = l.id
  ) pois
  CROSS JOIN LATERAL (
    SELECT MAX(e.updated_at) AS changed_at,
      COALESCE(BOOL_OR(e.activo AND e.estado_revision = 'PUBLICADO'
        AND e.ubicacion IS NOT NULL), FALSE) AS published
      FROM establecimientos_turisticos e
     WHERE e.localidad_id = l.id
  ) establishments
  CROSS JOIN LATERAL (
    SELECT GREATEST(MAX(rt.updated_at), MAX(version.updated_at)) AS changed_at
      FROM rutas_transporte rt
      LEFT JOIN rutas_transporte_versiones version
        ON version.ruta_transporte_id = rt.id
      JOIN centro_rutas_transporte crt ON crt.ruta_transporte_id = rt.id
      JOIN centros_turisticos ct ON ct.id = crt.centro_turistico_id
      JOIN zonas_turisticas z ON z.id = ct.zona_turistica_id
     WHERE z.localidad_id = l.id
  ) routes
  CROSS JOIN LATERAL (
    SELECT GREATEST(zones.changed_at, centers.changed_at, pois.changed_at,
      establishments.changed_at, routes.changed_at, paquete.publicado_at)
      AS changed_at
  ) content
  WHERE l.activo AND l.tipo_localidad = 'CIUDAD'
    AND c.activo AND p.activo
  ORDER BY p.nombre, c.nombre, l.nombre`;
}

function mapCity(row: CityRow): OfflineCity {
  return {
    slug: citySlug(row),
    name: row.name,
    canton: row.canton,
    province: row.province,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    package:
      row.package_version === null
        ? null
        : {
            version: row.package_version,
            checksumSha256: row.package_checksum,
            zoomMin: row.package_zoom_min ?? 8,
            zoomMax: row.package_zoom_max ?? 17,
            publishedAt: row.package_published_at?.toISOString() ?? null,
          },
  };
}

function mapRoute(row: RouteRow): OfflineManifestRoute {
  const durationMinutes =
    row.duration_minutes === null
      ? estimateRouteDurationMinutes(row.distance_meters, row.transport_code)
      : Number(row.duration_minutes);

  return {
    key: [row.name, row.origin, row.destination]
      .join("-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    publicKey: publicKey("route", row.id),
    name: row.name,
    origin: row.origin,
    destination: row.destination,
    durationMinutes,
    durationEstimated:
      row.duration_minutes === null && durationMinutes !== null,
    distanceMeters:
      row.distance_meters === null ? null : Number(row.distance_meters),
    transportCode: row.transport_code,
    geometry: row.geometry,
    directions: Array.isArray(row.directions) ? row.directions : [],
  };
}

function mapPoi(row: PoiRow): OfflineManifestPoi {
  return {
    key: publicKey("poi", row.id),
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    category: null,
    icon: "tourism-information",
  };
}

function mapEstablishment(
  row: OfflineManifestEstablishment,
): OfflineManifestEstablishment {
  return {
    id: Number(row.id),
    name: row.name,
    activity: row.activity,
    classification: row.classification,
    category: row.category,
    categoryLabel: row.categoryLabel,
    address: row.address,
    phone: row.phone,
    localityName: row.localityName,
    latitude: row.latitude,
    longitude: row.longitude,
    approximate: row.approximate,
    icon: row.icon,
    group: row.group,
  };
}

function publicKey(kind: "route" | "poi", id: string): string {
  return `${kind}-${createHash("sha256")
    .update(`offline:${kind}:${id}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function citySlug(row: Pick<CityRow, "province" | "canton" | "name">): string {
  return [row.province, row.canton, row.name]
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
