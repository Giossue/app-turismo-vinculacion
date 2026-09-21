import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type {
  NearbyTransportStop,
  NearbyTransportStopsQuery,
  PublicTransportCenter,
  PublicTransportDetail,
  PublicTransportRepository,
  PublicTransportRoute,
  PublicTransportSchedule,
  PublicTransportStop,
} from "../application/public-transport.repository";

type CenterRow = { id: string; name: string };

type RouteRow = {
  routeId: string;
  name: string;
  transportType: string;
  operator: string;
  origin: string;
  destination: string;
  price: string | number | null;
  durationMinutes: string | number | null;
  arrivalInstruction: string | null;
};

type StopRow = {
  name: string;
  address: string | null;
  latitude: string | number;
  longitude: string | number;
  order: number;
};

type ScheduleRow = {
  dayOfWeek: number;
  departureTime: string;
  arrivalTime: string | null;
};

type DetailRow = {
  operator: string;
  terminal: string | null;
  frequency: string | null;
  transferDetail: string | null;
};

type NearbyStopRow = {
  name: string;
  address: string | null;
  latitude: string | number;
  longitude: string | number;
  distanceMeters: string | number;
  routes: unknown;
};

type NearbyStopRouteRow = {
  name: string;
  transportType: string;
  operator: string;
};

@Injectable()
export class PostgresPublicTransportRepository
  implements PublicTransportRepository
{
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findForPublishedCenter(
    code: string,
  ): Promise<PublicTransportCenter | null> {
    const centerRows = await this.dataSource.query<CenterRow[]>(
      `SELECT c.id::text AS id, c.nombre AS name
         FROM centros_turisticos c
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
        WHERE c.activo = TRUE
          AND er.codigo = 'PUBLICADO'
          AND c.codigo_atractivo = $1
        LIMIT 1`,
      [code],
    );
    const center = centerRows[0];
    if (!center) return null;

    const [routeRows, details, transportTypes] = await Promise.all([
      this.dataSource.query<RouteRow[]>(
        `SELECT rt.id::text AS "routeId",
                rt.nombre AS name,
                tt.nombre AS "transportType",
                coop.nombre AS operator,
                rt.origen AS origin,
                rt.destino AS destination,
                rt.precio AS price,
                EXTRACT(EPOCH FROM rt.duracion_estimada) / 60 AS "durationMinutes",
                crt.indicacion_llegada AS "arrivalInstruction"
           FROM centro_rutas_transporte crt
           JOIN rutas_transporte rt ON rt.id = crt.ruta_transporte_id
           JOIN cooperativas_transporte coop ON coop.id = rt.cooperativa_id
           JOIN tipos_transporte tt ON tt.id = rt.tipo_transporte_id
          WHERE crt.centro_turistico_id = $1
            AND rt.activo = TRUE
            AND coop.activo = TRUE
            AND tt.activo = TRUE
          ORDER BY rt.nombre, rt.id
          LIMIT 20`,
        [center.id],
      ),
      this.dataSource.query<DetailRow[]>(
        `SELECT dt.operador_cooperativa AS operator,
                dt.estacion_terminal AS terminal,
                fs.nombre AS frequency,
                dt.detalle_traslado AS "transferDetail"
           FROM detalles_transporte dt
           LEFT JOIN frecuencias_servicio fs
             ON fs.id = dt.frecuencia_servicio_id
          WHERE dt.centro_turistico_id = $1
          ORDER BY dt.id
          LIMIT 20`,
        [center.id],
      ),
      this.dataSource.query<Array<{ name: string }>>(
        `SELECT tt.nombre AS name
           FROM centro_tipos_transporte ctt
           JOIN tipos_transporte tt ON tt.id = ctt.tipo_transporte_id
          WHERE ctt.centro_turistico_id = $1
            AND tt.activo = TRUE
          ORDER BY tt.nombre`,
        [center.id],
      ),
    ]);

    const routes = await Promise.all(
      routeRows.map(async (route) => {
        const [stops, schedules] = await Promise.all([
          this.dataSource.query<StopRow[]>(
            `SELECT p.nombre AS name,
                    p.direccion_referencia AS address,
                    p.latitud::double precision AS latitude,
                    p.longitud::double precision AS longitude,
                    rp.orden AS "order"
               FROM ruta_paradas rp
               JOIN paradas_transporte p
                 ON p.id = rp.parada_transporte_id
              WHERE rp.ruta_transporte_id = $1
                AND p.activo = TRUE
              ORDER BY rp.orden, p.nombre`,
            [route.routeId],
          ),
          this.dataSource.query<ScheduleRow[]>(
            `SELECT dia_semana AS "dayOfWeek",
                    to_char(hora_salida, 'HH24:MI') AS "departureTime",
                    CASE WHEN hora_llegada IS NULL THEN NULL
                         ELSE to_char(hora_llegada, 'HH24:MI') END AS "arrivalTime"
               FROM horarios_ruta
              WHERE ruta_transporte_id = $1
                AND activo = TRUE
              ORDER BY dia_semana, hora_salida`,
            [route.routeId],
          ),
        ]);

        return {
          name: route.name,
          transportType: route.transportType,
          operator: route.operator,
          origin: route.origin,
          destination: route.destination,
          price: toNullableNumber(route.price),
          durationMinutes: toNullableNumber(route.durationMinutes),
          arrivalInstruction: route.arrivalInstruction,
          stops: stops.map(mapStop),
          schedules: schedules.map(mapSchedule),
        } satisfies PublicTransportRoute;
      }),
    );

    return {
      centerName: center.name,
      transportTypes: transportTypes.map((item) => item.name),
      details: details.map(mapDetail),
      routes,
    };
  }

  async listNearbyStops(
    query: NearbyTransportStopsQuery,
  ): Promise<readonly NearbyTransportStop[]> {
    const rows = await this.dataSource.query<NearbyStopRow[]>(
      `SELECT p.nombre AS name,
              p.direccion_referencia AS address,
              p.latitud::double precision AS latitude,
              p.longitud::double precision AS longitude,
              ST_Distance(
                p.ubicacion,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) AS "distanceMeters",
              COALESCE((
                SELECT json_agg(json_build_object(
                         'name', rt.nombre,
                         'transportType', tt.nombre,
                         'operator', coop.nombre
                       ) ORDER BY rt.nombre, coop.nombre)
                  FROM ruta_paradas rp
                  JOIN rutas_transporte rt
                    ON rt.id = rp.ruta_transporte_id
                  JOIN cooperativas_transporte coop
                    ON coop.id = rt.cooperativa_id
                  JOIN tipos_transporte tt
                    ON tt.id = rt.tipo_transporte_id
                 WHERE rp.parada_transporte_id = p.id
                   AND rt.activo = TRUE
                   AND coop.activo = TRUE
                   AND tt.activo = TRUE
              ), '[]'::json) AS routes
         FROM paradas_transporte p
        WHERE p.activo = TRUE
          AND ST_DWithin(
                p.ubicacion,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                $3
              )
          AND EXISTS (
            SELECT 1
              FROM ruta_paradas rp_exists
              JOIN rutas_transporte rt_exists
                ON rt_exists.id = rp_exists.ruta_transporte_id
              JOIN cooperativas_transporte coop_exists
                ON coop_exists.id = rt_exists.cooperativa_id
              JOIN tipos_transporte tt_exists
                ON tt_exists.id = rt_exists.tipo_transporte_id
             WHERE rp_exists.parada_transporte_id = p.id
               AND rt_exists.activo = TRUE
               AND coop_exists.activo = TRUE
               AND tt_exists.activo = TRUE
          )
        ORDER BY "distanceMeters", p.nombre
        LIMIT $4`,
      [query.latitude, query.longitude, query.radiusMeters, query.limit],
    );

    return rows.map((row) => ({
      name: row.name,
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceMeters: Number(row.distanceMeters),
      routes: mapNearbyStopRoutes(row.routes),
    }));
  }
}

function mapStop(row: StopRow): PublicTransportStop {
  return {
    name: row.name,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    order: Number(row.order),
  };
}

function mapSchedule(row: ScheduleRow): PublicTransportSchedule {
  return {
    dayOfWeek: Number(row.dayOfWeek),
    departureTime: row.departureTime,
    arrivalTime: row.arrivalTime,
  };
}

function mapDetail(row: DetailRow): PublicTransportDetail {
  return {
    operator: row.operator,
    terminal: row.terminal,
    frequency: row.frequency,
    transferDetail: row.transferDetail,
  };
}

function mapNearbyStopRoutes(value: unknown): readonly NearbyStopRouteRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNearbyStopRoute);
}

function isNearbyStopRoute(value: unknown): value is NearbyStopRouteRow {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.transportType === "string" &&
    typeof record.operator === "string"
  );
}

function toNullableNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
