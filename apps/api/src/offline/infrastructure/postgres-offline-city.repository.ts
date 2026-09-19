import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type {
  OfflineCity,
  OfflineCityManifest,
  OfflineGeoJson,
  OfflineGeoJsonLineString,
  OfflineManifestCenter,
  OfflineManifestRoute,
} from "../domain/offline-city";
import type { OfflineCityRepository } from "../application/offline-city.repository";

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
  name: string;
  origin: string;
  destination: string;
  duration_minutes: number | null;
  geometry: OfflineGeoJsonLineString;
  directions: unknown;
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

    const [boundaryRows, centers, routes] = await Promise.all([
      this.dataSource.query<readonly { boundary: OfflineGeoJson | null }[]>(
        `SELECT ST_AsGeoJSON(limite.geometria)::jsonb AS boundary
         FROM localidad_limites_oficiales limite
         WHERE limite.localidad_id = $1 AND limite.vigente
         ORDER BY limite.version DESC LIMIT 1`,
        [cityRow.id],
      ),
      this.dataSource.query<CenterRow[]>(
        `SELECT c.codigo_atractivo AS code, c.nombre AS name,
          c.descripcion AS description, c.latitud AS latitude,
          c.longitud AS longitude, ca.nombre AS category,
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
         WHERE c.activo AND er.codigo = 'PUBLICADO'
           AND z.localidad_id = $1
         ORDER BY c.nombre, c.codigo_atractivo`,
        [cityRow.id],
      ),
      this.dataSource.query<RouteRow[]>(
        `SELECT DISTINCT ON (rt.id) rt.nombre AS name, rt.origen AS origin,
          rt.destino AS destination,
          EXTRACT(EPOCH FROM rt.duracion_estimada) / 60 AS duration_minutes,
          ST_AsGeoJSON(version.geometria)::jsonb AS geometry,
          version.indicaciones AS directions
         FROM rutas_transporte rt
         JOIN rutas_transporte_versiones version
           ON version.ruta_transporte_id = rt.id
          AND version.estado = 'PUBLICADA'
         JOIN centro_rutas_transporte crt ON crt.ruta_transporte_id = rt.id
         JOIN centros_turisticos c ON c.id = crt.centro_turistico_id
         JOIN zonas_turisticas z ON z.id = c.zona_turistica_id
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
         WHERE rt.activo AND c.activo AND er.codigo = 'PUBLICADO'
           AND z.localidad_id = $1
         ORDER BY rt.id, version.version DESC`,
        [cityRow.id],
      ),
    ]);

    return {
      city: mapCity(cityRow),
      package: {
        version: cityRow.package_version,
        checksumSha256: cityRow.package_checksum,
        zoomMin: cityRow.package_zoom_min ?? 8,
        zoomMax: cityRow.package_zoom_max ?? 17,
        publishedAt: cityRow.package_published_at?.toISOString() ?? null,
      },
      boundary: boundaryRows[0]?.boundary ?? null,
      centers,
      routes: routes.map(mapRoute),
    };
  }
}

function cityQuery(): string {
  return `SELECT l.id::text AS id, l.nombre AS name, c.nombre AS canton,
    p.nombre AS province, l.latitud AS latitude, l.longitud AS longitude,
    paquete.version AS package_version,
    paquete.checksum_sha256 AS package_checksum,
    paquete.zoom_min AS package_zoom_min,
    paquete.zoom_max AS package_zoom_max,
    paquete.publicado_at AS package_published_at
  FROM localidades l
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  LEFT JOIN paquetes_offline_ciudad paquete
    ON paquete.localidad_id = l.id AND paquete.estado = 'PUBLICADO'
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
  return {
    key: [row.name, row.origin, row.destination]
      .join("-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name: row.name,
    origin: row.origin,
    destination: row.destination,
    durationMinutes:
      row.duration_minutes === null ? null : Number(row.duration_minutes),
    geometry: row.geometry,
    directions: Array.isArray(row.directions) ? row.directions : [],
  };
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
