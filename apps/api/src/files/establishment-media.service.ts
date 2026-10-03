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

import { establishmentPhotoUrl } from "../establishments/public-establishment";
import { MediaStorageService } from "./media-storage.service";
import {
  assertImageSize,
  assertUploadSize,
  hasMediaSignature,
  MEDIA_TYPES,
  mediaMetadata,
} from "./media-validation";
import type { MediaUploadInput } from "./media.service";

export type EstablishmentPhotoInput = Omit<MediaUploadInput, "typeCode">;

type EstablishmentPhotoRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string | null;
  description: string | null;
  sourceAuthor: string | null;
  order: number | null;
  state: string;
  createdAt: string;
};

/**
 * Fotografías de un establecimiento concreto del catastro. Reutiliza el
 * almacenamiento y las validaciones de la multimedia de fichas; la auditoría
 * se registra en `auditoria_catalogos` (ESTABLISHMENT), como el resto del
 * catastro. Lo que sube un administrador se publica de inmediato; lo que sube
 * un agente queda pendiente hasta que se aprueba el catastro.
 */
@Injectable()
export class EstablishmentMediaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(MediaStorageService) private readonly storage: MediaStorageService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async listForAdmin(id: string, actorId?: number, isAdmin = true) {
    const establishmentId = parseEstablishmentId(id);
    const rows = (await this.dataSource.query(
      `SELECT a.id, a.nombre_original AS "originalName", a.mime_type AS "mimeType",
              a.tamano_bytes AS "sizeBytes", a.descripcion AS description,
              a.fuente_autor AS "sourceAuthor", a.orden AS "order",
              a.estado AS state, a.created_at AS "createdAt"
         FROM archivos_establecimiento_turistico a
         JOIN establecimientos_turisticos e ON e.id = a.establecimiento_id
        WHERE e.id = $1
          AND e.eliminado_at IS NULL
          AND a.estado <> 'ELIMINADO'
          AND ($2::boolean OR e.responsable_usuario_id = $3)
        ORDER BY a.orden NULLS LAST, a.created_at DESC, a.id DESC`,
      [establishmentId, isAdmin, actorId ?? null],
    )) as EstablishmentPhotoRow[];
    return {
      items: rows.map((row) => ({
        id: Number(row.id),
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
        description: row.description,
        sourceAuthor: row.sourceAuthor,
        order: row.order,
        state: row.state,
        createdAt: row.createdAt,
        downloadUrl:
          row.state === "PUBLICADO" ? establishmentPhotoUrl(row.id) : null,
      })),
    };
  }

  async upload(
    actorId: number,
    id: string,
    input: EstablishmentPhotoInput,
    isAdmin = true,
  ) {
    const establishmentId = parseEstablishmentId(id);
    assertUploadSize(
      input.buffer,
      this.config.getOrThrow<number>("MEDIA_MAX_UPLOAD_BYTES"),
    );
    const mimeType = input.mimeType.trim().toLowerCase();
    const definition = MEDIA_TYPES.get(mimeType);
    if (
      !definition ||
      definition.kind !== "image" ||
      !hasMediaSignature(input.buffer, mimeType)
    ) {
      throw new BadRequestException(
        "La fotografía no es válida. Solo se aceptan imágenes JPEG, PNG o WebP.",
      );
    }
    assertImageSize(
      input.buffer,
      this.config.getOrThrow<number>("MEDIA_MAX_IMAGE_BYTES"),
    );
    const { originalName, description, sourceAuthor } = mediaMetadata(input);
    const order = await this.dataSource.transaction(async (manager) => {
      await this.establishment(manager, establishmentId, actorId, isAdmin);
      const orderRows = (await manager.query(
        `SELECT COALESCE(MAX(orden), 0) + 1 AS next
           FROM archivos_establecimiento_turistico
          WHERE establecimiento_id = $1 AND estado <> 'ELIMINADO'`,
        [establishmentId],
      )) as Array<{ next: number }>;
      return orderRows[0]?.next ?? 1;
    });
    const objectKey = `establishments/${establishmentId}/photos/${randomUUID()}${definition.extension}`;
    await this.storage.put(objectKey, input.buffer, mimeType);
    const state = isAdmin ? "PUBLICADO" : "PENDIENTE";
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.establishment(manager, establishmentId, actorId, isAdmin);
        const checksum = createHash("sha256")
          .update(input.buffer)
          .digest("hex");
        const inserted = (await manager.query(
          `INSERT INTO archivos_establecimiento_turistico
            (establecimiento_id, nombre_original, ruta_archivo, proveedor_almacenamiento,
             checksum_sha256, mime_type, tamano_bytes, fuente_autor, descripcion,
             orden, estado, subido_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            establishmentId,
            originalName,
            objectKey,
            this.config.getOrThrow<"LOCAL" | "S3">("MEDIA_STORAGE_PROVIDER"),
            checksum,
            mimeType,
            input.buffer.length,
            sourceAuthor,
            description,
            order,
            state,
            actorId,
          ],
        )) as Array<{ id: string }>;
        const file = inserted[0];
        if (!file)
          throw new ConflictException("No se pudo registrar la fotografía.");
        await this.audit(
          manager,
          establishmentId,
          actorId,
          "AGREGAR_MULTIMEDIA",
          {
            mediaId: Number(file.id),
            originalName,
            mimeType,
            sizeBytes: input.buffer.length,
            state,
          },
        );
        return {
          id: Number(file.id),
          originalName,
          mimeType,
          sizeBytes: input.buffer.length,
          description,
          sourceAuthor,
          order,
          state,
          downloadUrl:
            state === "PUBLICADO" ? establishmentPhotoUrl(file.id) : null,
        };
      });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async remove(actorId: number, id: string, mediaId: number, isAdmin = true) {
    const establishmentId = parseEstablishmentId(id);
    const deleted = await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT a.id, a.ruta_archivo AS key, a.estado AS state
           FROM archivos_establecimiento_turistico a
           JOIN establecimientos_turisticos e ON e.id = a.establecimiento_id
          WHERE a.id = $1 AND e.id = $2
            AND a.estado <> 'ELIMINADO'
            AND e.eliminado_at IS NULL
            AND ($3::boolean OR e.responsable_usuario_id = $4)
            AND ($3::boolean OR e.estado_revision IN ('BORRADOR', 'RECHAZADO'))
          FOR UPDATE OF a`,
        [mediaId, establishmentId, isAdmin, actorId],
      )) as Array<{ id: string; key: string; state: string }>;
      const file = rows[0];
      if (!file) throw new NotFoundException("No se encontró la fotografía.");
      await manager.query(
        `UPDATE archivos_establecimiento_turistico
            SET estado = 'ELIMINADO', eliminado_por = $2, eliminado_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [mediaId, actorId],
      );
      await this.audit(
        manager,
        establishmentId,
        actorId,
        "ELIMINAR_MULTIMEDIA",
        { mediaId, previousState: file.state },
      );
      return { key: file.key };
    });
    await this.storage.remove(deleted.key).catch(() => undefined);
    return { id: mediaId, state: "ELIMINADO" as const };
  }

  /** Solo fotografías publicadas de catastros publicados y visibles. */
  async publicFile(mediaId: number) {
    const rows = (await this.dataSource.query(
      `SELECT a.ruta_archivo AS key, a.mime_type AS "mimeType"
         FROM archivos_establecimiento_turistico a
         JOIN establecimientos_turisticos e ON e.id = a.establecimiento_id
        WHERE a.id = $1 AND a.estado = 'PUBLICADO'
          AND e.activo = TRUE
          AND e.eliminado_at IS NULL
          AND e.estado_revision = 'PUBLICADO'
        LIMIT 1`,
      [mediaId],
    )) as Array<{ key: string; mimeType: string }>;
    const row = rows[0];
    if (!row) throw new NotFoundException("No se encontró la fotografía.");
    return { body: await this.storage.get(row.key), mimeType: row.mimeType };
  }

  private async establishment(
    manager: EntityManager,
    establishmentId: number,
    actorId: number,
    isAdmin: boolean,
  ) {
    const rows = (await manager.query(
      `SELECT e.id
         FROM establecimientos_turisticos e
        WHERE e.id = $1
          AND e.eliminado_at IS NULL
          AND ($2::boolean OR e.responsable_usuario_id = $3)
          AND ($2::boolean OR e.estado_revision IN ('BORRADOR', 'RECHAZADO'))
        FOR UPDATE`,
      [establishmentId, isAdmin, actorId],
    )) as Array<{ id: string }>;
    if (!rows[0])
      throw new NotFoundException("No se encontró el establecimiento.");
  }

  private async audit(
    manager: EntityManager,
    establishmentId: number,
    actorId: number,
    action: "AGREGAR_MULTIMEDIA" | "ELIMINAR_MULTIMEDIA",
    next: unknown,
  ) {
    await manager.query(
      `INSERT INTO auditoria_catalogos
        (usuario_id, catalogo_codigo, registro_id, accion, datos_anteriores, datos_nuevos)
       VALUES ($1, 'ESTABLISHMENT', $2, $3, '{}'::jsonb, $4::jsonb)`,
      [actorId, establishmentId, action, JSON.stringify(next)],
    );
  }
}

export function parseEstablishmentId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException(
      "El identificador del establecimiento no es válido.",
    );
  }
  return id;
}
