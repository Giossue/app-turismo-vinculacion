import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RolesGuard } from "../auth/roles.guard";
import { EstablishmentMediaService } from "./establishment-media.service";
import { MediaService, type CenterFileTypeCode } from "./media.service";

@ApiTags("admin-media")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class FilesController {
  constructor(
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(EstablishmentMediaService)
    private readonly establishmentMedia: EstablishmentMediaService,
  ) {}

  @Get("centers/:code/media")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async list(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.media.listForAdmin(
        code,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Post("centers/:code/media")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async upload(
    @Param("code") code: string,
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { part, buffer } = await readUpload(request);
    return {
      data: await this.media.upload(
        user.id,
        code,
        {
          originalName: part.filename,
          mimeType: part.mimetype,
          buffer,
          typeCode: parseTypeCode(fieldText(part.fields?.typeCode)),
          description: fieldText(part.fields?.description),
          sourceAuthor: fieldText(part.fields?.sourceAuthor),
        },
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Delete("centers/:code/media/:id")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async remove(
    @Param("code") code: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mediaId = parseMediaId(id);
    return {
      data: await this.media.remove(
        user.id,
        code,
        mediaId,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Get("establishments/:id/media")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async listEstablishment(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishmentMedia.listForAdmin(
        id,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Post("establishments/:id/media")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async uploadEstablishment(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { part, buffer } = await readUpload(request);
    return {
      data: await this.establishmentMedia.upload(
        user.id,
        id,
        {
          originalName: part.filename,
          mimeType: part.mimetype,
          buffer,
          description: fieldText(part.fields?.description),
          sourceAuthor: fieldText(part.fields?.sourceAuthor),
        },
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Delete("establishments/:id/media/:mediaId")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async removeEstablishment(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishmentMedia.remove(
        user.id,
        id,
        parseMediaId(mediaId),
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }
}

@ApiTags("public-media")
@Controller("media")
export class PublicMediaController {
  constructor(
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(EstablishmentMediaService)
    private readonly establishmentMedia: EstablishmentMediaService,
  ) {}

  @Get(":id")
  async get(@Param("id") id: string, @Res() response: FastifyReply) {
    sendMedia(response, await this.media.publicFile(parseMediaId(id)));
  }

  @Get("establishments/:id")
  async getEstablishmentPhoto(
    @Param("id") id: string,
    @Res() response: FastifyReply,
  ) {
    sendMedia(
      response,
      await this.establishmentMedia.publicFile(parseMediaId(id)),
    );
  }
}

function sendMedia(
  response: FastifyReply,
  file: { body: Buffer | Uint8Array; mimeType: string },
) {
  response
    .header("Content-Type", file.mimeType)
    .header("Cache-Control", "public, max-age=3600")
    .send(file.body);
}

function parseMediaId(id: string): number {
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId < 1) {
    throw new BadRequestException(
      "El identificador de la fotografía no es válido.",
    );
  }
  return mediaId;
}

async function readUpload(request: FastifyRequest) {
  const part = await request.file();
  if (!part) {
    throw new BadRequestException("Debes seleccionar un archivo.");
  }
  let buffer: Buffer;
  try {
    buffer = await part.toBuffer();
  } catch {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  if (part.file.truncated) {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  return { part, buffer };
}

function fieldText(field: unknown): string | undefined {
  if (!field || typeof field !== "object" || !("value" in field))
    return undefined;
  const raw = (field as { value?: unknown }).value;
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length ? value : undefined;
}

function parseTypeCode(
  value: string | undefined,
): CenterFileTypeCode | undefined {
  if (
    value === "FOTOGRAFIA" ||
    value === "VIDEO" ||
    value === "AUDIO" ||
    value === "MAPA" ||
    value === "PLAN_CONTINGENCIA" ||
    value === "OTRO"
  ) {
    return value;
  }
  return undefined;
}
