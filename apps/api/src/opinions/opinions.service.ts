import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";

import type { OpinionContentDto, OpinionReviewAction } from "./opinions.dto";

type SqlClient = Pick<DataSource, "query"> | Pick<EntityManager, "query">;
type SqlRow = Record<string, unknown>;
type OpinionRootStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export type PublicOpinion = Readonly<{
  authorName: string;
  rating: number | null;
  comment: string | null;
  publishedAt: string;
}>;

export type PublicOpinionPage = Readonly<{
  items: readonly PublicOpinion[];
  total: number;
  limit: number;
  offset: number;
  summary: Readonly<{
    total: number;
    totalRatings: number;
    averageRating: number | null;
    distribution: Readonly<Record<"1" | "2" | "3" | "4" | "5", number>>;
  }>;
}>;

export type OwnOpinionVersion = Readonly<{
  rating: number | null;
  comment: string | null;
  version: number;
  submittedAt: string;
  reviewedAt?: string | null;
}>;

export type OwnOpinionState = Readonly<{
  status: OpinionRootStatus;
  current: OwnOpinionVersion | null;
  pending: OwnOpinionVersion | null;
  lastRejected: (OwnOpinionVersion & { reason: string | null }) | null;
  canCreate: boolean;
  canEdit: boolean;
}>;

export type AdminOpinionStatus = "PENDIENTE" | "APROBADA";

export type AdminOpinion = Readonly<{
  reviewCode: string;
  status: AdminOpinionStatus;
  version: number;
  submittedAt: string;
  authorName: string;
  target: Readonly<{
    type: "CENTRO" | "PUNTO_INTERES";
    code: string | null;
    name: string;
  }>;
  proposed: OwnOpinionVersion;
  current: OwnOpinionVersion | null;
}>;

export type AdminOpinionPage = Readonly<{
  items: readonly AdminOpinion[];
  total: number;
  limit: number;
  offset: number;
}>;

export type AdminOpinionModeration = Readonly<{
  action: "APROBAR" | "RECHAZAR";
  moderatorName: string;
  reason: string | null;
  createdAt: string;
}>;

export type AdminOpinionHistoryVersion = Readonly<{
  reviewCode: string;
  version: number;
  rating: number | null;
  comment: string | null;
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "REEMPLAZADA";
  submittedAt: string;
  reviewedAt: string | null;
  moderations: readonly AdminOpinionModeration[];
}>;

export type AdminOpinionHistory = Readonly<{
  reviewCode: string;
  authorName: string;
  target: Readonly<{
    type: "CENTRO" | "PUNTO_INTERES";
    code: string | null;
    name: string;
  }>;
  versions: readonly AdminOpinionHistoryVersion[];
}>;

type CenterTarget = Readonly<{ id: string; code: string; name: string }>;

@Injectable()
export class OpinionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listPublished(
    code: string,
    limit: number,
    offset: number,
  ): Promise<PublicOpinionPage> {
    const normalizedCode = this.normalizeCode(code);
    const center = await this.findPublishedCenter(
      this.dataSource,
      normalizedCode,
    );
    if (!center) {
      throw new NotFoundException("El centro turístico no está disponible.");
    }

    const [rows, summaryRows] = await Promise.all([
      this.dataSource.query<SqlRow[]>(
        `SELECT split_part(BTRIM(u.nombre), ' ', 1) AS author_name,
                v.calificacion AS rating,
                v.comentario AS comment,
                v.created_at AS published_at
           FROM opiniones o
           JOIN opinion_versiones v ON v.id = o.version_publicada_id
                                      AND v.estado_moderacion = 'APROBADA'
           JOIN usuarios u ON u.id = o.usuario_id
          WHERE o.centro_turistico_id = $1
            AND o.estado_moderacion = 'APROBADA'
          ORDER BY v.created_at DESC, v.id DESC
          LIMIT $2 OFFSET $3`,
        [center.id, limit, offset],
      ),
      this.dataSource.query<SqlRow[]>(
        `SELECT COUNT(*)::int AS total,
                COUNT(v.calificacion)::int AS total_ratings,
                ROUND(AVG(v.calificacion), 1)::float AS average_rating,
                COUNT(*) FILTER (WHERE v.calificacion = 1)::int AS rating_1,
                COUNT(*) FILTER (WHERE v.calificacion = 2)::int AS rating_2,
                COUNT(*) FILTER (WHERE v.calificacion = 3)::int AS rating_3,
                COUNT(*) FILTER (WHERE v.calificacion = 4)::int AS rating_4,
                COUNT(*) FILTER (WHERE v.calificacion = 5)::int AS rating_5
           FROM opiniones o
           JOIN opinion_versiones v ON v.id = o.version_publicada_id
                                      AND v.estado_moderacion = 'APROBADA'
          WHERE o.centro_turistico_id = $1
            AND o.estado_moderacion = 'APROBADA'`,
        [center.id],
      ),
    ]);

    const summary = summaryRows[0] ?? {};
    return {
      items: rows.map((row) => ({
        authorName: stringValue(row, "author_name") || "Visitante",
        rating: nullableNumber(row, "rating"),
        comment: nullableString(row, "comment"),
        publishedAt: isoDate(row, "published_at"),
      })),
      total: integerValue(summary, "total"),
      limit,
      offset,
      summary: {
        total: integerValue(summary, "total"),
        totalRatings: integerValue(summary, "total_ratings"),
        averageRating: nullableNumber(summary, "average_rating"),
        distribution: {
          "1": integerValue(summary, "rating_1"),
          "2": integerValue(summary, "rating_2"),
          "3": integerValue(summary, "rating_3"),
          "4": integerValue(summary, "rating_4"),
          "5": integerValue(summary, "rating_5"),
        },
      },
    };
  }

  async getOwn(code: string, userId: number): Promise<OwnOpinionState | null> {
    const normalizedCode = this.normalizeCode(code);
    const center = await this.findPublishedCenter(
      this.dataSource,
      normalizedCode,
    );
    if (!center) {
      throw new NotFoundException("El centro turístico no está disponible.");
    }
    return this.getOwnForCenter(this.dataSource, userId, center.id);
  }

  async create(
    code: string,
    userId: number,
    input: OpinionContentDto,
  ): Promise<OwnOpinionState> {
    const content = this.normalizeContent(input);
    const normalizedCode = this.normalizeCode(code);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const center = await this.findPublishedCenter(manager, normalizedCode);
        if (!center) {
          throw new NotFoundException(
            "El centro turístico ya no está disponible.",
          );
        }

        const active = await manager.query<SqlRow[]>(
          `SELECT id
             FROM opiniones
            WHERE usuario_id = $1
              AND centro_turistico_id = $2
              AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
            FOR UPDATE`,
          [userId, center.id],
        );
        if (active[0]) {
          throw new ConflictException(
            "Ya tienes una opinión activa para este lugar. Puedes editarla cuando no tenga una revisión pendiente.",
          );
        }

        const roots = await manager.query<SqlRow[]>(
          `INSERT INTO opiniones (usuario_id, centro_turistico_id, estado_moderacion)
           VALUES ($1, $2, 'PENDIENTE')
           RETURNING id`,
          [userId, center.id],
        );
        const root = roots[0];
        if (!root) throw new Error("No se pudo crear la opinión.");

        await manager.query(
          `INSERT INTO opinion_versiones
             (codigo_publico, opinion_id, numero_version, calificacion, comentario)
           VALUES ($1, $2, 1, $3, $4)`,
          [randomUUID(), root.id, content.rating, content.comment],
        );
        const state = await this.getOwnForCenter(manager, userId, center.id);
        if (!state) throw new Error("No se pudo leer la opinión creada.");
        return state;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "Ya existe una opinión activa para este lugar. Actualiza la ficha e inténtalo de nuevo.",
        );
      }
      throw error;
    }
  }

  async edit(
    code: string,
    userId: number,
    input: OpinionContentDto,
  ): Promise<OwnOpinionState> {
    const content = this.normalizeContent(input);
    const normalizedCode = this.normalizeCode(code);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const center = await this.findPublishedCenter(manager, normalizedCode);
        if (!center) {
          throw new NotFoundException(
            "El centro turístico ya no está disponible.",
          );
        }

        const roots = await manager.query<SqlRow[]>(
          `SELECT id, estado_moderacion, version_publicada_id
             FROM opiniones
            WHERE usuario_id = $1
              AND centro_turistico_id = $2
              AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            FOR UPDATE`,
          [userId, center.id],
        );
        const root = roots[0];
        if (!root) {
          throw new ConflictException(
            "No tienes una opinión publicada para editar. Envía una nueva opinión.",
          );
        }
        if (stringValue(root, "estado_moderacion") !== "APROBADA") {
          throw new ConflictException(
            "Tu opinión ya tiene una revisión pendiente. Espera la decisión antes de editarla.",
          );
        }
        const publishedVersionId = stringValue(root, "version_publicada_id");
        if (!publishedVersionId) {
          throw new ConflictException(
            "La opinión no tiene una versión publicada para editar.",
          );
        }

        const pending = await manager.query<SqlRow[]>(
          `SELECT id
             FROM opinion_versiones
            WHERE opinion_id = $1
              AND estado_moderacion = 'PENDIENTE'
            LIMIT 1
            FOR UPDATE`,
          [root.id],
        );
        if (pending[0]) {
          throw new ConflictException(
            "Ya existe una edición pendiente para esta opinión.",
          );
        }

        const nextVersionRows = await manager.query<SqlRow[]>(
          `SELECT COALESCE(MAX(numero_version), 0) + 1 AS next_version
             FROM opinion_versiones
            WHERE opinion_id = $1`,
          [root.id],
        );
        const nextVersion = integerValue(
          nextVersionRows[0] ?? {},
          "next_version",
        );
        await manager.query(
          `INSERT INTO opinion_versiones
             (codigo_publico, opinion_id, numero_version, calificacion, comentario)
           VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), root.id, nextVersion, content.rating, content.comment],
        );
        await manager.query(
          `UPDATE opiniones
              SET estado_moderacion = 'PENDIENTE', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [root.id],
        );
        const state = await this.getOwnForCenter(manager, userId, center.id);
        if (!state) throw new Error("No se pudo leer la opinión editada.");
        return state;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "La opinión cambió mientras la editabas. Recarga la ficha e inténtalo de nuevo.",
        );
      }
      throw error;
    }
  }

  async listAdmin(limit: number, offset: number): Promise<AdminOpinionPage> {
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<SqlRow[]>(
        `SELECT COALESCE(pending_v.codigo_publico, published_v.codigo_publico)::text AS review_code,
                CASE WHEN pending_v.id IS NOT NULL THEN 'PENDIENTE' ELSE 'APROBADA' END AS status,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.numero_version
                     ELSE published_v.numero_version
                END AS numero_version,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.created_at
                     ELSE published_v.created_at
                END AS submitted_at,
                u.nombre AS author_name,
                CASE WHEN c.id IS NOT NULL THEN 'CENTRO' ELSE 'PUNTO_INTERES' END AS target_type,
                c.codigo_atractivo AS target_code,
                COALESCE(c.nombre, pi.nombre) AS target_name,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.calificacion
                     ELSE published_v.calificacion
                END AS proposed_rating,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.comentario
                     ELSE published_v.comentario
                END AS proposed_comment,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.numero_version
                     ELSE published_v.numero_version
                END AS proposed_version,
                CASE WHEN pending_v.id IS NOT NULL
                     THEN pending_v.created_at
                     ELSE published_v.created_at
                END AS proposed_submitted_at,
                published_v.calificacion AS current_rating,
                published_v.comentario AS current_comment,
                published_v.numero_version AS current_version,
                published_v.created_at AS current_submitted_at
           FROM opiniones o
           JOIN usuarios u ON u.id = o.usuario_id
           LEFT JOIN centros_turisticos c ON c.id = o.centro_turistico_id
           LEFT JOIN puntos_interes pi ON pi.id = o.punto_interes_id
           LEFT JOIN LATERAL (
             SELECT v.*
               FROM opinion_versiones v
              WHERE v.opinion_id = o.id
                AND v.estado_moderacion = 'PENDIENTE'
              ORDER BY v.numero_version DESC, v.id DESC
              LIMIT 1
           ) pending_v ON TRUE
           LEFT JOIN opinion_versiones published_v
             ON published_v.id = o.version_publicada_id
            AND published_v.estado_moderacion = 'APROBADA'
          WHERE o.estado_moderacion IN ('PENDIENTE', 'APROBADA')
            AND (pending_v.id IS NOT NULL OR published_v.id IS NOT NULL)
          ORDER BY CASE WHEN pending_v.id IS NOT NULL THEN 0 ELSE 1 END,
                   CASE WHEN pending_v.id IS NOT NULL
                        THEN pending_v.created_at
                        ELSE published_v.created_at
                   END ASC,
                   CASE WHEN pending_v.id IS NOT NULL THEN pending_v.id ELSE published_v.id END ASC
          LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.dataSource.query<SqlRow[]>(
        `SELECT COUNT(*)::int AS total
           FROM opiniones o
           LEFT JOIN opinion_versiones published_v
             ON published_v.id = o.version_publicada_id
            AND published_v.estado_moderacion = 'APROBADA'
          WHERE o.estado_moderacion IN ('PENDIENTE', 'APROBADA')
            AND (
              published_v.id IS NOT NULL
              OR EXISTS (
                SELECT 1
                  FROM opinion_versiones pending_v
                 WHERE pending_v.opinion_id = o.id
                   AND pending_v.estado_moderacion = 'PENDIENTE'
              )
            )`,
      ),
    ]);

    return {
      items: rows.map((row) => {
        const status = stringValue(row, "status") as AdminOpinionStatus;
        return {
          reviewCode: stringValue(row, "review_code"),
          status,
          version: integerValue(row, "numero_version"),
          submittedAt: isoDate(row, "submitted_at"),
          authorName: stringValue(row, "author_name") || "Usuario",
          target: {
            type: stringValue(row, "target_type") as "CENTRO" | "PUNTO_INTERES",
            code: nullableString(row, "target_code"),
            name: stringValue(row, "target_name") || "Destino sin nombre",
          },
          proposed: {
            rating: nullableNumber(row, "proposed_rating"),
            comment: nullableString(row, "proposed_comment"),
            version: integerValue(row, "proposed_version"),
            submittedAt: isoDate(row, "proposed_submitted_at"),
          },
          current:
            status === "PENDIENTE" &&
            row.current_version !== null &&
            row.current_version !== undefined
              ? {
                  rating: nullableNumber(row, "current_rating"),
                  comment: nullableString(row, "current_comment"),
                  version: integerValue(row, "current_version"),
                  submittedAt: isoDate(row, "current_submitted_at"),
                }
              : null,
        };
      }),
      total: integerValue(countRows[0] ?? {}, "total"),
      limit,
      offset,
    };
  }

  async getAdminHistory(reviewCode: string): Promise<AdminOpinionHistory> {
    const normalizedCode = reviewCode.trim().toLowerCase();
    if (!isUuid(normalizedCode)) {
      throw new BadRequestException("El código de revisión no es válido.");
    }

    const rows = await this.dataSource.query<SqlRow[]>(
      `SELECT v.codigo_publico::text AS review_code,
              v.numero_version,
              v.calificacion,
              v.comentario,
              v.estado_moderacion AS status,
              v.created_at AS submitted_at,
              v.revisado_at AS reviewed_at,
              u.nombre AS author_name,
              CASE WHEN c.id IS NOT NULL THEN 'CENTRO' ELSE 'PUNTO_INTERES' END AS target_type,
              c.codigo_atractivo AS target_code,
              COALESCE(c.nombre, pi.nombre) AS target_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'action', m.accion,
                    'reason', m.motivo,
                    'moderatorName', moderator.nombre,
                    'createdAt', m.created_at
                  ) ORDER BY m.created_at DESC, m.id DESC
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'::json
              ) AS moderations
         FROM opinion_versiones v
         JOIN opiniones o ON o.id = v.opinion_id
         JOIN usuarios u ON u.id = o.usuario_id
         LEFT JOIN centros_turisticos c ON c.id = o.centro_turistico_id
         LEFT JOIN puntos_interes pi ON pi.id = o.punto_interes_id
         LEFT JOIN moderaciones_opinion m ON m.opinion_version_id = v.id
         LEFT JOIN usuarios moderator ON moderator.id = m.moderador_id
        WHERE v.opinion_id = (
          SELECT selected.opinion_id
            FROM opinion_versiones selected
           WHERE selected.codigo_publico = $1::uuid
           LIMIT 1
        )
        GROUP BY v.id,
                 v.codigo_publico,
                 v.numero_version,
                 v.calificacion,
                 v.comentario,
                 v.estado_moderacion,
                 v.created_at,
                 v.revisado_at,
                 u.nombre,
                 c.id,
                 c.codigo_atractivo,
                 c.nombre,
                 pi.id,
                 pi.nombre
        ORDER BY v.numero_version DESC, v.id DESC`,
      [normalizedCode],
    );

    const first = rows[0];
    if (!first) {
      throw new NotFoundException("No se encontró el historial de la opinión.");
    }

    return {
      reviewCode: normalizedCode,
      authorName: stringValue(first, "author_name") || "Usuario",
      target: {
        type: stringValue(first, "target_type") as "CENTRO" | "PUNTO_INTERES",
        code: nullableString(first, "target_code"),
        name: stringValue(first, "target_name") || "Destino sin nombre",
      },
      versions: rows.map((row) => ({
        reviewCode: stringValue(row, "review_code"),
        version: integerValue(row, "numero_version"),
        rating: nullableNumber(row, "calificacion"),
        comment: nullableString(row, "comentario"),
        status: stringValue(row, "status") as
          "PENDIENTE" | "APROBADA" | "RECHAZADA" | "REEMPLAZADA",
        submittedAt: isoDate(row, "submitted_at"),
        reviewedAt: nullableIsoDate(row, "reviewed_at"),
        moderations: moderationValues(row.moderations),
      })),
    };
  }

  async review(
    reviewCode: string,
    moderatorId: number,
    action: OpinionReviewAction,
    reason?: string,
  ): Promise<
    Readonly<{ reviewCode: string; status: "APROBADA" | "RECHAZADA" }>
  > {
    const normalizedCode = reviewCode.trim().toLowerCase();
    if (!isUuid(normalizedCode)) {
      throw new BadRequestException("El código de revisión no es válido.");
    }
    const normalizedReason = reason?.trim() || null;
    if (action === "REJECT" && !normalizedReason) {
      throw new BadRequestException(
        "Debes indicar el motivo por el que rechazas la opinión.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<SqlRow[]>(
        `SELECT v.id AS version_id,
                v.codigo_publico::text AS review_code,
                o.id AS opinion_id,
                o.version_publicada_id
           FROM opinion_versiones v
           JOIN opiniones o ON o.id = v.opinion_id
          WHERE v.codigo_publico = $1::uuid
            AND v.estado_moderacion = 'PENDIENTE'
          FOR UPDATE OF v, o`,
        [normalizedCode],
      );
      const pending = rows[0];
      if (!pending) {
        throw new ConflictException(
          "La opinión ya fue revisada o ya no está disponible.",
        );
      }

      const versionId = stringValue(pending, "version_id");
      const opinionId = stringValue(pending, "opinion_id");
      const publishedVersionId = nullableString(
        pending,
        "version_publicada_id",
      );
      const nextStatus: "APROBADA" | "RECHAZADA" =
        action === "APPROVE" ? "APROBADA" : "RECHAZADA";

      if (action === "APPROVE") {
        if (publishedVersionId) {
          await manager.query(
            `UPDATE opinion_versiones
                SET estado_moderacion = 'REEMPLAZADA', revisado_at = CURRENT_TIMESTAMP
              WHERE id = $1
                AND estado_moderacion = 'APROBADA'`,
            [publishedVersionId],
          );
        }
        await manager.query(
          `UPDATE opinion_versiones
              SET estado_moderacion = 'APROBADA', revisado_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [versionId],
        );
        await manager.query(
          `UPDATE opiniones
              SET estado_moderacion = 'APROBADA', version_publicada_id = $2,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [opinionId, versionId],
        );
      } else {
        await manager.query(
          `UPDATE opinion_versiones
              SET estado_moderacion = 'RECHAZADA', revisado_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [versionId],
        );
        await manager.query(
          `UPDATE opiniones
              SET estado_moderacion = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [opinionId, publishedVersionId ? "APROBADA" : "RECHAZADA"],
        );
      }

      await manager.query(
        `INSERT INTO moderaciones_opinion
           (opinion_id, opinion_version_id, moderador_id, accion, motivo)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          opinionId,
          versionId,
          moderatorId,
          action === "APPROVE" ? "APROBAR" : "RECHAZAR",
          normalizedReason,
        ],
      );

      return { reviewCode: normalizedCode, status: nextStatus };
    });
  }

  private async getOwnForCenter(
    client: SqlClient,
    userId: number,
    centerId: string,
  ): Promise<OwnOpinionState | null> {
    const rows = await client.query<SqlRow[]>(
      `SELECT o.estado_moderacion AS root_status,
              current_v.calificacion AS current_rating,
              current_v.comentario AS current_comment,
              current_v.numero_version AS current_version,
              current_v.created_at AS current_submitted_at,
              current_v.revisado_at AS current_reviewed_at,
              pending_v.calificacion AS pending_rating,
              pending_v.comentario AS pending_comment,
              pending_v.numero_version AS pending_version,
              pending_v.created_at AS pending_submitted_at,
              pending_v.revisado_at AS pending_reviewed_at,
              rejected_v.calificacion AS rejected_rating,
              rejected_v.comentario AS rejected_comment,
              rejected_v.numero_version AS rejected_version,
              rejected_v.created_at AS rejected_submitted_at,
              rejected_v.revisado_at AS rejected_reviewed_at,
              rejected_v.reason AS rejected_reason
         FROM opiniones o
         LEFT JOIN opinion_versiones current_v ON current_v.id = o.version_publicada_id
         LEFT JOIN LATERAL (
           SELECT v.*
             FROM opinion_versiones v
            WHERE v.opinion_id = o.id
              AND v.estado_moderacion = 'PENDIENTE'
            ORDER BY v.numero_version DESC, v.id DESC
            LIMIT 1
         ) pending_v ON TRUE
         LEFT JOIN LATERAL (
           SELECT v.*,
                  (SELECT m.motivo
                     FROM moderaciones_opinion m
                    WHERE m.opinion_version_id = v.id
                      AND m.accion = 'RECHAZAR'
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 1) AS reason
             FROM opinion_versiones v
            WHERE v.opinion_id = o.id
              AND v.estado_moderacion = 'RECHAZADA'
            ORDER BY v.numero_version DESC, v.id DESC
            LIMIT 1
         ) rejected_v ON TRUE
        WHERE o.usuario_id = $1
          AND o.centro_turistico_id = $2
        ORDER BY CASE
                   WHEN o.estado_moderacion IN ('PENDIENTE', 'APROBADA') THEN 0
                   ELSE 1
                 END,
                 o.updated_at DESC,
                 o.id DESC
        LIMIT 1`,
      [userId, centerId],
    );
    const row = rows[0];
    if (!row) return null;

    const status = stringValue(row, "root_status") as OpinionRootStatus;
    const pending =
      nullableNumber(row, "pending_version") === null
        ? null
        : {
            rating: nullableNumber(row, "pending_rating"),
            comment: nullableString(row, "pending_comment"),
            version: integerValue(row, "pending_version"),
            submittedAt: isoDate(row, "pending_submitted_at"),
            reviewedAt: nullableIsoDate(row, "pending_reviewed_at"),
          };
    const current =
      nullableNumber(row, "current_version") === null
        ? null
        : {
            rating: nullableNumber(row, "current_rating"),
            comment: nullableString(row, "current_comment"),
            version: integerValue(row, "current_version"),
            submittedAt: isoDate(row, "current_submitted_at"),
            reviewedAt: nullableIsoDate(row, "current_reviewed_at"),
          };
    const lastRejected =
      nullableNumber(row, "rejected_version") === null
        ? null
        : {
            rating: nullableNumber(row, "rejected_rating"),
            comment: nullableString(row, "rejected_comment"),
            version: integerValue(row, "rejected_version"),
            submittedAt: isoDate(row, "rejected_submitted_at"),
            reviewedAt: nullableIsoDate(row, "rejected_reviewed_at"),
            reason: nullableString(row, "rejected_reason"),
          };

    return {
      status,
      current,
      pending,
      lastRejected,
      canCreate: status === "RECHAZADA",
      canEdit: status === "APROBADA" && pending === null,
    };
  }

  private async findPublishedCenter(
    client: SqlClient,
    code: string,
  ): Promise<CenterTarget | null> {
    const rows = await client.query<SqlRow[]>(
      `SELECT c.id, c.codigo_atractivo AS code, c.nombre AS name
         FROM centros_turisticos c
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
        WHERE c.codigo_atractivo = $1
          AND c.activo
          AND er.codigo = 'PUBLICADO'
        LIMIT 1`,
      [code],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: stringValue(row, "id"),
      code: stringValue(row, "code"),
      name: stringValue(row, "name"),
    };
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim();
    if (!normalized || normalized.length > 100) {
      throw new BadRequestException("El código del centro no es válido.");
    }
    return normalized;
  }

  private normalizeContent(input: OpinionContentDto): Readonly<{
    rating: number | null;
    comment: string | null;
  }> {
    const rating = input.rating == null ? null : Number(input.rating);
    const comment = input.comment?.trim() || null;
    if (
      rating !== null &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      throw new BadRequestException("La calificación debe estar entre 1 y 5.");
    }
    if (!rating && !comment) {
      throw new BadRequestException(
        "Escribe un comentario o selecciona una calificación.",
      );
    }
    if (comment && comment.length > 2000) {
      throw new BadRequestException(
        "El comentario no puede superar 2000 caracteres.",
      );
    }
    return { rating, comment };
  }
}

function stringValue(row: SqlRow, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

function nullableString(row: SqlRow, key: string): string | null {
  const value = row[key];
  return value === null || value === undefined ? null : String(value);
}

function nullableNumber(row: SqlRow, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(row: SqlRow, key: string): number {
  return Math.trunc(nullableNumber(row, key) ?? 0);
}

function isoDate(row: SqlRow, key: string): string {
  const value = row[key];
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? new Date(0).toISOString()
    : date.toISOString();
}

function nullableIsoDate(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return isoDate(row, key);
}

function moderationValues(value: unknown): AdminOpinionModeration[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as SqlRow;
    const action = stringValue(row, "action");
    if (action !== "APROBAR" && action !== "RECHAZAR") return [];
    return [
      {
        action,
        moderatorName: stringValue(row, "moderatorName") || "Administrador",
        reason: nullableString(row, "reason"),
        createdAt: isoDate(row, "createdAt"),
      },
    ];
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
