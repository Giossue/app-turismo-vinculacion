import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import type { AdminNavigationSummaryDto } from "./admin-navigation.dto";
import { centerReviewStateSql } from "./center-review-state";

type NavigationSection = keyof AdminNavigationSummaryDto;
type NavigationRow = {
  section: NavigationSection;
  pending: string | number;
  latestChange: Date | string | null;
};

/** Aggregate operational signals; no record content or per-user read state. */
@Injectable()
export class AdminNavigationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async summary(
    actorId: number,
    isAdmin: boolean,
  ): Promise<AdminNavigationSummaryDto> {
    const rows = await this.dataSource.query<NavigationRow[]>(
      `WITH scoped_centers AS (
         SELECT c.id, c.estado_resenia_id, c.publicado_at, c.eliminado_at,
                c.created_at, c.updated_at
           FROM centros_turisticos c
          WHERE $2::boolean OR c.responsable_usuario_id = $1::bigint
       ), center_inventory AS (
         SELECT c.id, c.eliminado_at,
                ${centerReviewStateSql("COALESCE(NULLIF(bs.codigo, 'PUBLICADO'), s.codigo)", "c.publicado_at")} AS state,
                GREATEST(c.created_at, c.updated_at, c.eliminado_at, b.updated_at) AS changed_at
           FROM scoped_centers c
           JOIN estados_resenia s ON s.id = c.estado_resenia_id
           LEFT JOIN borradores_centros_turisticos b ON b.centro_turistico_id = c.id
           LEFT JOIN estados_resenia bs ON bs.id = b.estado_resenia_id
       ), center_counts AS (
         SELECT COUNT(*) FILTER (WHERE eliminado_at IS NULL
                                 AND state IN ('BORRADOR', 'EN_REVISION'))::int AS pending,
                COUNT(*) FILTER (WHERE eliminado_at IS NULL
                                 AND state = 'EN_REVISION')::int AS reviewing
           FROM center_inventory
       ), center_changes AS (
         SELECT changed_at FROM center_inventory
         UNION ALL
         SELECT a.created_at FROM auditoria_fichas a
           JOIN scoped_centers c ON c.id = a.centro_turistico_id
       ), scoped_establishments AS (
         SELECT e.id, e.estado_revision, e.eliminado_at, e.created_at, e.updated_at,
                e.fecha_solicitud, e.fecha_revision
           FROM establecimientos_turisticos e
          WHERE $2::boolean OR e.responsable_usuario_id = $1::bigint
       ), establishment_counts AS (
         SELECT COUNT(*) FILTER (WHERE eliminado_at IS NULL
                    AND estado_revision IN ('BORRADOR', 'RECHAZADO', 'EN_REVISION'))::int AS pending,
                COUNT(*) FILTER (WHERE eliminado_at IS NULL
                                 AND estado_revision = 'EN_REVISION')::int AS reviewing
           FROM scoped_establishments
       ), establishment_changes AS (
         SELECT GREATEST(created_at, updated_at, eliminado_at) AS changed_at
           FROM scoped_establishments
         UNION ALL
         SELECT a.created_at FROM auditoria_catalogos a
           JOIN scoped_establishments e ON e.id = a.registro_id
          WHERE a.catalogo_codigo = 'ESTABLISHMENT'
       ), review_changes AS (
         SELECT GREATEST(r.fecha_solicitud, r.fecha_revision) AS changed_at
           FROM revisiones_publicacion r
           JOIN scoped_centers c ON c.id = r.centro_turistico_id
          WHERE $2::boolean
         UNION ALL
         SELECT a.created_at FROM auditoria_fichas a
           JOIN scoped_centers c ON c.id = a.centro_turistico_id
          WHERE $2::boolean
            AND a.accion IN ('SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'PUBLICAR', 'ELIMINAR')
         UNION ALL
         SELECT GREATEST(fecha_solicitud, fecha_revision)
           FROM scoped_establishments WHERE $2::boolean
         UNION ALL
         SELECT a.created_at FROM auditoria_catalogos a
           JOIN scoped_establishments e ON e.id = a.registro_id
          WHERE $2::boolean AND a.catalogo_codigo = 'ESTABLISHMENT'
            AND a.accion IN ('SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'ELIMINAR')
       ), opinion_changes AS (
         SELECT GREATEST(o.created_at, o.updated_at, o.eliminado_at) AS changed_at
           FROM opiniones o
          WHERE $2::boolean
         UNION ALL
         SELECT GREATEST(v.created_at, v.revisado_at)
           FROM opinion_versiones v JOIN opiniones o ON o.id = v.opinion_id
          WHERE $2::boolean
         UNION ALL
         SELECT m.created_at
           FROM moderaciones_opinion m JOIN opiniones o ON o.id = m.opinion_id
          WHERE $2::boolean
       )
       SELECT 'centers' AS section, pending,
              (SELECT MAX(changed_at) FROM center_changes) AS "latestChange"
         FROM center_counts
       UNION ALL
       SELECT 'establishments', pending,
              (SELECT MAX(changed_at) FROM establishment_changes)
         FROM establishment_counts
       UNION ALL
       SELECT 'review', CASE WHEN $2::boolean THEN c.reviewing + e.reviewing ELSE 0 END,
              (SELECT MAX(changed_at) FROM review_changes)
         FROM center_counts c CROSS JOIN establishment_counts e
       UNION ALL
       SELECT 'opinions', COUNT(*)::int,
              (SELECT MAX(changed_at) FROM opinion_changes)
         FROM opiniones o
        WHERE $2::boolean AND o.eliminado_at IS NULL
          AND o.estado_moderacion IN ('PENDIENTE', 'APROBADA')
          AND EXISTS (SELECT 1 FROM opinion_versiones v
                       WHERE v.opinion_id = o.id AND v.estado_moderacion = 'PENDIENTE')
       UNION ALL
       SELECT 'catalogs', 0, MAX(a.created_at)
         FROM auditoria_catalogos a
        WHERE $2::boolean AND a.catalogo_codigo IN (
          'ACCESSIBILITY', 'ACTIVITY', 'FACILITY',
          'ESTABLISHMENT_CLASSIFICATION', 'ESTABLISHMENT_CATEGORY'
        )`,
      [actorId, isAdmin],
    );

    const empty = () => ({ pending: 0, latestChange: null });
    const summary: AdminNavigationSummaryDto = {
      review: empty(),
      opinions: empty(),
      centers: empty(),
      establishments: empty(),
      catalogs: empty(),
    };
    for (const row of rows) {
      if (
        !isAdmin &&
        row.section !== "centers" &&
        row.section !== "establishments"
      )
        continue;
      summary[row.section] = {
        pending: Number(row.pending),
        latestChange:
          row.latestChange === null
            ? null
            : new Date(row.latestChange).toISOString(),
      };
    }
    return summary;
  }
}
