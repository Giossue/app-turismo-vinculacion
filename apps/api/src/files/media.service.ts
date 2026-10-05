import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { createHash, randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";

import { optimizePhoto, PHOTO_UPLOAD_TYPES } from "./media-image";
import { MediaStorageService } from "./media-storage.service";
import {
  assertImageSize,
  assertUploadSize,
  hasMediaSignature,
  MEDIA_TYPES,
  mediaMetadata,
} from "./media-validation";

const MEDIA_CATALOG_CODES = new Set(["FOTOGRAFIA", "VIDEO", "AUDIO"]);
const DOCUMENT_CATALOG_CODES = new Set(["MAPA", "PLAN_CONTINGENCIA", "OTRO"]);
export type CenterFileTypeCode =
  "FOTOGRAFIA" | "VIDEO" | "AUDIO" | "MAPA" | "PLAN_CONTINGENCIA" | "OTRO";

export type MediaUploadInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  typeCode?: CenterFileTypeCode;
  description?: string;
  sourceAuthor?: string;
};

type MediaRow = {
  id: string;
  code: string;
  name: string;
  typeCode: CenterFileTypeCode;
  typeName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string | null;
  description: string | null;
  sourceAuthor: string | null;
  order: number | null;
  state: string;
  createdAt: string;
};

@Injectable()
export class MediaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(MediaStorageService) private readonly storage: MediaStorageService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async listForAdmin(code: string, actorId?: number, isAdmin = true) {
    const ownerCondition = isAdmin ? "TRUE" : "c.responsable_usuario_id = $2";
    const rows = (await this.dataSource.query(
      `SELECT a.id, TRIM(c.codigo_atractivo) AS code, c.nombre AS name,
              t.codigo AS "typeCode", t.nombre AS "typeName",
              a.nombre_original AS "originalName", a.mime_type AS "mimeType",
              a.tamano_bytes AS "sizeBytes", a.descripcion AS description,
              a.fuente_autor AS "sourceAuthor", a.orden AS "order",
              a.estado AS state, a.created_at AS "createdAt"
         FROM archivos_centro_turistico a
         JOIN centros_turisticos c ON c.id = a.centro_turistico_id
         JOIN tipos_archivo_centro_turistico t ON t.id = a.tipo_archivo_centro_id
        WHERE TRIM(c.codigo_atractivo) = TRIM($1)
          AND c.eliminado_at IS NULL
          AND a.estado <> 'ELIMINADO'
          AND ${ownerCondition}
        ORDER BY a.orden NULLS LAST, a.created_at DESC, a.id DESC`,
      isAdmin ? [code] : [code, actorId],
    )) as MediaRow[];
    return {
      items: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        typeCode: row.typeCode,
        typeName: row.typeName,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
        description: row.description,
        sourceAuthor: row.sourceAuthor,
        order: row.order,
        state: row.state,
        createdAt: row.createdAt,
        downloadUrl:
          row.state === "PUBLICADO" && MEDIA_CATALOG_CODES.has(row.typeCode)
            ? `/api/v1/media/${row.id}`
            : null,
      })),
    };
  }

  async upload(
    actorId: number,
    code: string,
    input: MediaUploadInput,
    isAdmin = true,
  ) {
    const maxImageBytes = this.config.getOrThrow<number>(
      "MEDIA_MAX_IMAGE_BYTES",
    );
    const maxUploadBytes = this.config.getOrThrow<number>(
      "MEDIA_MAX_UPLOAD_BYTES",
    );
    assertUploadSize(input.buffer, maxUploadBytes);
    const mimeType = input.mimeType.trim().toLowerCase();
    const definition = MEDIA_TYPES.get(mimeType);
    const typeCode = input.typeCode ?? defaultTypeCode(definition?.kind);
    if (
      !definition ||
      !typeCode ||
      !isAllowedType(typeCode, definition.kind) ||
      !hasMediaSignature(input.buffer, mimeType)
    ) {
      throw new BadRequestException(
        "El archivo no es válido para el tipo institucional seleccionado. " +
          "Solo se aceptan imágenes, videos MP4/WebM y audios MP3/WAV/OGG válidos. " +
          "Los anexos también pueden ser PDF.",
      );
    }
    if (definition.kind === "image") {
      assertImageSize(input.buffer, maxImageBytes);
    }
    if (typeCode === "FOTOGRAFIA" && !PHOTO_UPLOAD_TYPES.has(mimeType)) {
      throw new BadRequestException(
        "La fotografía debe ser una imagen JPEG o PNG.",
      );
    }
    const stored =
      typeCode === "FOTOGRAFIA"
        ? await optimizePhoto(input.buffer)
        : {
            buffer: input.buffer,
            mimeType,
            extension: definition.extension,
          };
    const { originalName, description, sourceAuthor } = mediaMetadata(input);
    const prepared = await this.dataSource.transaction(async (manager) => {
      const center = await this.center(manager, code, actorId, isAdmin);
      const typeRows = (await manager.query(
        `SELECT id FROM tipos_archivo_centro_turistico WHERE codigo = $1 AND activo LIMIT 1`,
        [typeCode],
      )) as Array<{ id: string }>;
      const fileType = typeRows[0];
      if (!fileType)
        throw new ConflictException("El tipo de archivo no está configurado.");
      const orderRows = (await manager.query(
        `SELECT COALESCE(MAX(orden), 0) + 1 AS next
           FROM archivos_centro_turistico
          WHERE centro_turistico_id = $1 AND tipo_archivo_centro_id = $2 AND estado <> 'ELIMINADO'`,
        [center.id, fileType.id],
      )) as Array<{ next: number }>;
      return {
        centerId: center.id,
        fileTypeId: fileType.id,
        order: orderRows[0]?.next ?? 1,
      };
    });
    const folder =
      typeCode === "FOTOGRAFIA"
        ? "photos"
        : MEDIA_CATALOG_CODES.has(typeCode)
          ? "media"
          : "documents";
    const objectKey = `centers/${prepared.centerId}/${folder}/${randomUUID()}${stored.extension}`;
    await this.storage.put(objectKey, stored.buffer, stored.mimeType);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const centerRows = (await manager.query(
          `SELECT id FROM centros_turisticos WHERE id = $1 AND eliminado_at IS NULL FOR UPDATE`,
          [prepared.centerId],
        )) as Array<{ id: string }>;
        if (!centerRows[0])
          throw new NotFoundException("No se encontró la ficha turística.");
        const checksum = createHash("sha256")
          .update(stored.buffer)
          .digest("hex");
        const inserted = (await manager.query(
          `INSERT INTO archivos_centro_turistico
            (centro_turistico_id, tipo_archivo_centro_id, nombre_original, ruta_archivo,
             proveedor_almacenamiento, checksum_sha256, mime_type, tamano_bytes,
             fuente_autor, descripcion, orden, estado, subido_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDIENTE',$12)
           RETURNING id`,
          [
            prepared.centerId,
            prepared.fileTypeId,
            originalName,
            objectKey,
            this.config.getOrThrow<"LOCAL" | "S3">("MEDIA_STORAGE_PROVIDER"),
            checksum,
            stored.mimeType,
            stored.buffer.length,
            sourceAuthor,
            description,
            prepared.order,
            actorId,
          ],
        )) as Array<{ id: string }>;
        const file = inserted[0];
        if (!file)
          throw new ConflictException("No se pudo registrar el archivo.");
        await this.audit(
          manager,
          prepared.centerId,
          actorId,
          "AGREGAR_MULTIMEDIA",
          {
            mediaId: Number(file.id),
            originalName,
            typeCode,
            mimeType: stored.mimeType,
            sizeBytes: stored.buffer.length,
          },
        );
        return {
          id: Number(file.id),
          originalName,
          mimeType: stored.mimeType,
          sizeBytes: stored.buffer.length,
          state: "PENDIENTE",
          typeCode,
          downloadUrl: null,
        };
      });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async remove(actorId: number, code: string, mediaId: number, isAdmin = true) {
    const deleted = await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT a.id, a.centro_turistico_id AS "centerId", a.ruta_archivo AS key,
                a.estado AS state
           FROM archivos_centro_turistico a
           JOIN centros_turisticos c ON c.id = a.centro_turistico_id
           JOIN estados_resenia center_state ON center_state.id = c.estado_resenia_id
          WHERE a.id = $1 AND TRIM(c.codigo_atractivo) = TRIM($2)
            AND a.estado <> 'ELIMINADO'
            AND c.eliminado_at IS NULL
            AND ($3::boolean OR c.responsable_usuario_id = $4)
            AND ($3::boolean OR center_state.codigo IN ('BORRADOR', 'RECHAZADO'))
          FOR UPDATE`,
        [mediaId, code, isAdmin, actorId],
      )) as Array<{ id: string; centerId: string; key: string; state: string }>;
      const file = rows[0];
      if (!file) throw new NotFoundException("No se encontró la fotografía.");
      await manager.query(
        `UPDATE archivos_centro_turistico
            SET estado = 'ELIMINADO', eliminado_por = $2, eliminado_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [mediaId, actorId],
      );
      await this.audit(manager, file.centerId, actorId, "ELIMINAR_MULTIMEDIA", {
        mediaId,
        previousState: file.state,
      });
      return { id: mediaId, state: "ELIMINADO" as const, key: file.key };
    });
    await this.storage.remove(deleted.key).catch(() => undefined);
    return { id: deleted.id, state: deleted.state };
  }

  async publishPending(
    manager: EntityManager,
    centerId: string,
    actorId: number,
  ) {
    const rows = (await manager.query(
      `UPDATE archivos_centro_turistico
          SET estado = 'PUBLICADO', updated_at = CURRENT_TIMESTAMP
        WHERE centro_turistico_id = $1 AND estado = 'PENDIENTE'
        RETURNING id`,
      [centerId],
    )) as Array<{ id: string }>;
    if (rows.length) {
      await this.audit(manager, centerId, actorId, "PUBLICAR_MULTIMEDIA", {
        mediaIds: rows.map((row) => Number(row.id)),
      });
    }
  }

  async publicFile(id: number) {
    const rows = (await this.dataSource.query(
      `SELECT a.ruta_archivo AS key, a.mime_type AS "mimeType"
         FROM archivos_centro_turistico a
         JOIN centros_turisticos c ON c.id = a.centro_turistico_id
         JOIN estados_resenia e ON e.id = c.estado_resenia_id
         JOIN tipos_archivo_centro_turistico t ON t.id = a.tipo_archivo_centro_id
        WHERE a.id = $1 AND a.estado = 'PUBLICADO' AND t.codigo IN ('FOTOGRAFIA', 'VIDEO', 'AUDIO')
          AND c.activo AND e.codigo = 'PUBLICADO'
          AND c.eliminado_at IS NULL
        LIMIT 1`,
      [id],
    )) as Array<{ key: string; mimeType: string }>;
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró la fotografía.");
    return { body: await this.storage.get(row.key), mimeType: row.mimeType };
  }

  private async center(
    manager: EntityManager,
    code: string,
    actorId?: number,
    isAdmin = true,
  ) {
    const rows = (await manager.query(
      `SELECT c.id, c.responsable_usuario_id AS "responsibleId"
         FROM centros_turisticos c
         JOIN estados_resenia center_state ON center_state.id = c.estado_resenia_id
        WHERE TRIM(codigo_atractivo) = TRIM($1)
          AND c.eliminado_at IS NULL
          AND ($2::boolean OR responsable_usuario_id = $3)
          AND ($2::boolean OR center_state.codigo IN ('BORRADOR', 'RECHAZADO'))
        FOR UPDATE`,
      [code, isAdmin, actorId ?? null],
    )) as Array<{ id: string }>;
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return rows[0];
  }

  private async audit(
    manager: EntityManager,
    centerId: string,
    actorId: number,
    action: string,
    next: unknown,
  ) {
    await manager.query(
      `INSERT INTO auditoria_fichas (centro_turistico_id, usuario_id, accion, datos_nuevos)
       VALUES ($1,$2,$3,$4::jsonb)`,
      [centerId, actorId, action, JSON.stringify(next)],
    );
  }
}

function defaultTypeCode(kind: string | undefined): CenterFileTypeCode | null {
  if (kind === "image") return "FOTOGRAFIA";
  if (kind === "video") return "VIDEO";
  if (kind === "audio") return "AUDIO";
  return kind === "document" ? "OTRO" : null;
}

function isAllowedType(typeCode: CenterFileTypeCode, kind: string): boolean {
  if (MEDIA_CATALOG_CODES.has(typeCode)) {
    return (
      (typeCode === "FOTOGRAFIA" && kind === "image") ||
      (typeCode === "VIDEO" && kind === "video") ||
      (typeCode === "AUDIO" && kind === "audio")
    );
  }
  return (
    DOCUMENT_CATALOG_CODES.has(typeCode) &&
    (kind === "document" || kind === "image")
  );
}
