import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import type { AdminActivityQueryDto } from "./admin.dto";

type ActivityRow = {
  id: string;
  type: "CENTRO" | "ESTABLECIMIENTO" | "CATALOGO" | "OPINION";
  action: string;
  context: string | null;
  subject: string;
  actor: string;
  createdAt: string;
};

const ACTIVITY_CTE = `
  WITH activity AS (
    SELECT 'CENTRO:' || a.id::text AS id,
           'CENTRO'::text AS type,
           a.accion AS action,
           a.seccion_codigo AS context,
           c.nombre AS subject,
           u.nombre AS actor,
           a.created_at AS "createdAt"
      FROM auditoria_fichas a
      JOIN centros_turisticos c ON c.id = a.centro_turistico_id
      JOIN usuarios u ON u.id = a.usuario_id

    UNION ALL

    SELECT 'ESTABLECIMIENTO:' || a.id::text,
           'ESTABLECIMIENTO'::text,
           a.accion,
           NULL::text,
           COALESCE(
             NULLIF(a.datos_nuevos->>'nombreComercial', ''),
             NULLIF(a.datos_anteriores->>'nombreComercial', ''),
             e.nombre_comercial,
             'Establecimiento'
           ),
           u.nombre,
           a.created_at
      FROM auditoria_catalogos a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN establecimientos_turisticos e ON e.id = a.registro_id
     WHERE a.catalogo_codigo = 'ESTABLISHMENT'

    UNION ALL

    SELECT 'CATALOGO:' || a.id::text,
           'CATALOGO'::text,
           a.accion,
           a.catalogo_codigo,
           COALESCE(
             NULLIF(a.datos_nuevos->>'name', ''),
             NULLIF(a.datos_anteriores->>'name', ''),
             NULLIF(a.datos_nuevos->>'nombre', ''),
             NULLIF(a.datos_anteriores->>'nombre', ''),
             'Opción de catálogo'
           ),
           u.nombre,
           a.created_at
      FROM auditoria_catalogos a
      JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.catalogo_codigo <> 'ESTABLISHMENT'

    UNION ALL

    SELECT 'OPINION:' || m.id::text,
           'OPINION'::text,
           m.accion,
           NULL::text,
           CASE
             WHEN c.id IS NOT NULL THEN 'Opinión sobre ' || c.nombre
             WHEN pi.id IS NOT NULL THEN 'Opinión sobre ' || pi.nombre
             ELSE 'Opinión'
           END,
           moderator.nombre,
           m.created_at
      FROM moderaciones_opinion m
      JOIN opinion_versiones v ON v.id = m.opinion_version_id
      JOIN opiniones o ON o.id = m.opinion_id
      JOIN usuarios moderator ON moderator.id = m.moderador_id
      LEFT JOIN centros_turisticos c ON c.id = o.centro_turistico_id
      LEFT JOIN puntos_interes pi ON pi.id = o.punto_interes_id
  )`;

@Injectable()
export class AdminActivityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(query: AdminActivityQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const values = [
      query.type ?? null,
      query.from ?? null,
      query.to ?? null,
      query.q ? `%${query.q}%` : null,
    ];
    const filtered = `
      SELECT * FROM activity
       WHERE ($1::text IS NULL OR type = $1)
         AND ($2::date IS NULL OR "createdAt" >= $2::date)
         AND ($3::date IS NULL OR "createdAt" < $3::date + INTERVAL '1 day')
         AND ($4::text IS NULL OR actor ILIKE $4 OR subject ILIKE $4
              OR action ILIKE $4 OR context ILIKE $4)`;
    const [countRows, items] = await Promise.all([
      this.dataSource.query(
        `${ACTIVITY_CTE} SELECT COUNT(*)::int AS total FROM (${filtered}) filtered_activity`,
        values,
      ) as Promise<Array<{ total: number }>>,
      this.dataSource.query(
        `${ACTIVITY_CTE} ${filtered}
         ORDER BY "createdAt" DESC, id DESC
         LIMIT $5 OFFSET $6`,
        [...values, query.limit, query.offset],
      ) as Promise<ActivityRow[]>,
    ]);

    return {
      items,
      total: countRows[0]?.total ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
