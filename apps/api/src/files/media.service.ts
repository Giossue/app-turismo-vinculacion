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

import { MediaStorageService } from "./media-storage.service";

const MEDIA_TYPES = new Map([
  ["image/jpeg", { catalogCode: "FOTOGRAFIA", extension: ".jpg" }],
  ["image/png", { catalogCode: "FOTOGRAFIA", extension: ".png" }],
  ["image/webp", { catalogCode: "FOTOGRAFIA", extension: ".webp" }],
  ["video/mp4", { catalogCode: "VIDEO", extension: ".mp4" }],
  ["video/webm", { catalogCode: "VIDEO", extension: ".webm" }],
  ["audio/mpeg", { catalogCode: "AUDIO", extension: ".mp3" }],
  ["audio/mp4", { catalogCode: "AUDIO", extension: ".m4a" }],
  ["audio/wav", { catalogCode: "AUDIO", extension: ".wav" }],
  ["audio/ogg", { catalogCode: "AUDIO", extension: ".ogg" }],
]);

export type MediaUploadInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  description?: string;
  sourceAuthor?: string;
};

type MediaRow = {
  id: string;
  code: string;
  name: string;
  typeCode: string;
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

  async listForAdmin(code: string) {
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
          AND a.estado <> 'ELIMINADO' AND t.codigo IN ('FOTOGRAFIA', 'VIDEO', 'AUDIO')
        ORDER BY a.orden NULLS LAST, a.created_at DESC, a.id DESC`,
      [code],
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
          row.state === "PUBLICADO" ? `/api/v1/media/${row.id}` : null,
      })),
    };
  }

  async upload(actorId: number, code: string, input: MediaUploadInput) {
    const maxImageBytes = this.config.getOrThrow<number>(
      "MEDIA_MAX_IMAGE_BYTES",
    );
    const maxUploadBytes = this.config.getOrThrow<number>(
      "MEDIA_MAX_UPLOAD_BYTES",
    );
    const maxBytes = maxUploadBytes;
    if (input.buffer.length === 0 || input.buffer.length > maxBytes) {
      throw new BadRequestException(
        `El archivo debe pesar entre 1 byte y ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
      );
    }
    const mimeType = input.mimeType.trim().toLowerCase();
    const definition = MEDIA_TYPES.get(mimeType);
    if (!definition || !hasMediaSignature(input.buffer, mimeType)) {
      throw new BadRequestException(
        "Solo se aceptan imágenes, videos MP4/WebM y audios MP3/WAV/OGG válidos.",
      );
    }
    if (
      definition.catalogCode === "FOTOGRAFIA" &&
      input.buffer.length > maxImageBytes
    ) {
      throw new BadRequestException(
        `La fotografía debe pesar como máximo ${Math.floor(maxImageBytes / (1024 * 1024))} MB.`,
      );
    }
    const originalName = sanitizeOriginalName(input.originalName);
    const description = input.description?.trim() || null;
    const sourceAuthor = input.sourceAuthor?.trim() || null;
    if (description && description.length > 2000) {
      throw new BadRequestException(
        "La descripción de la fotografía es demasiado larga.",
      );
    }
    if (sourceAuthor && sourceAuthor.length > 250) {
      throw new BadRequestException(
        "La fuente o autor de la fotografía es demasiado larga.",
      );
    }
    const prepared = await this.dataSource.transaction(async (manager) => {
      const center = await this.center(manager, code);
      const typeRows = (await manager.query(
        `SELECT id FROM tipos_archivo_centro_turistico WHERE codigo = $1 AND activo LIMIT 1`,
        [definition.catalogCode],
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
    const folder = definition.catalogCode === "FOTOGRAFIA" ? "photos" : "media";
    const objectKey = `centers/${prepared.centerId}/${folder}/${randomUUID()}${definition.extension}`;
    await this.storage.put(objectKey, input.buffer, mimeType);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const centerRows = (await manager.query(
          `SELECT id FROM centros_turisticos WHERE id = $1 FOR UPDATE`,
          [prepared.centerId],
        )) as Array<{ id: string }>;
        if (!centerRows[0])
          throw new NotFoundException("No se encontró la ficha turística.");
        const checksum = createHash("sha256")
          .update(input.buffer)
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
            mimeType,
            input.buffer.length,
            sourceAuthor,
            description,
            prepared.order,
            actorId,
          ],
        )) as Array<{ id: string }>;
        const file = inserted[0];
        if (!file)
          throw new ConflictException("No se pudo registrar la fotografía.");
        await this.audit(
          manager,
          prepared.centerId,
          actorId,
          "AGREGAR_MULTIMEDIA",
          {
            mediaId: Number(file.id),
            originalName,
            mimeType,
            sizeBytes: input.buffer.length,
          },
        );
        return {
          id: Number(file.id),
          originalName,
          mimeType,
          sizeBytes: input.buffer.length,
          state: "PENDIENTE",
          downloadUrl: null,
        };
      });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async remove(actorId: number, code: string, mediaId: number) {
    const deleted = await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT a.id, a.centro_turistico_id AS "centerId", a.ruta_archivo AS key,
                a.estado AS state
           FROM archivos_centro_turistico a
           JOIN centros_turisticos c ON c.id = a.centro_turistico_id
          WHERE a.id = $1 AND TRIM(c.codigo_atractivo) = TRIM($2)
            AND a.estado <> 'ELIMINADO'
          FOR UPDATE`,
        [mediaId, code],
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
        LIMIT 1`,
      [id],
    )) as Array<{ key: string; mimeType: string }>;
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró la fotografía.");
    return { body: await this.storage.get(row.key), mimeType: row.mimeType };
  }

  private async center(manager: EntityManager, code: string) {
    const rows = (await manager.query(
      `SELECT id FROM centros_turisticos WHERE TRIM(codigo_atractivo) = TRIM($1) FOR UPDATE`,
      [code],
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

function sanitizeOriginalName(value: string): string {
  const normalized = value.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim();
  return normalized.slice(0, 255) || "fotografia";
}

function hasMediaSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg")
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mimeType === "video/webm") {
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (mimeType === "audio/mpeg") {
    return (
      buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );
  }
  if (mimeType === "audio/wav") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE"
    );
  }
  return buffer.subarray(0, 4).toString("ascii") === "OggS";
}
