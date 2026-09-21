import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type {
  NearbyPublicPoisQuery,
  PublicPoiRepository,
} from "../application/public-poi.repository";
import type { PublicPoi, PublicPoiPage } from "../domain/public-poi";

type PoiRow = {
  name: string;
  description: string | null;
  zoneName: string;
  localityName: string;
  latitude: string | number;
  longitude: string | number;
  distanceMeters: string | number;
};

@Injectable()
export class PostgresPublicPoiRepository implements PublicPoiRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listNearby(query: NearbyPublicPoisQuery): Promise<PublicPoiPage> {
    const rows = await this.dataSource.query<PoiRow[]>(
      `SELECT pi.nombre AS "name",
              pi.descripcion AS "description",
              z.nombre AS "zoneName",
              l.nombre AS "localityName",
              pi.latitud::double precision AS latitude,
              pi.longitud::double precision AS longitude,
              ST_Distance(
                pi.ubicacion,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) AS "distanceMeters"
         FROM puntos_interes pi
         JOIN zonas_turisticas z ON z.id = pi.zona_turistica_id
         JOIN localidades l ON l.id = z.localidad_id
         JOIN cantones co ON co.id = l.canton_id
         JOIN provincias p ON p.id = co.provincia_id
        WHERE pi.activo = TRUE
          AND z.activo = TRUE
          AND l.activo = TRUE
          AND co.activo = TRUE
          AND p.activo = TRUE
          AND ST_DWithin(
                pi.ubicacion,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                $3
              )
          AND (
            $4::text IS NULL
            OR pi.nombre ILIKE '%' || $4 || '%'
            OR COALESCE(pi.descripcion, '') ILIKE '%' || $4 || '%'
            OR z.nombre ILIKE '%' || $4 || '%'
          )
        ORDER BY "distanceMeters", pi.nombre
        LIMIT $5`,
      [
        query.latitude,
        query.longitude,
        query.radiusMeters,
        query.category ?? null,
        query.limit,
      ],
    );

    return { items: rows.map(mapPublicPoi) };
  }
}

function mapPublicPoi(row: PoiRow): PublicPoi {
  return {
    name: row.name,
    description: row.description,
    zoneName: row.zoneName,
    localityName: row.localityName,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceMeters: Number(row.distanceMeters),
  };
}
