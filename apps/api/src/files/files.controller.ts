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
import { MediaService, type CenterFileTypeCode } from "./media.service";

@ApiTags("admin-media")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class FilesController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get("centers/:code/media")
  @Roles("ADMINISTRADOR")
  async list(@Param("code") code: string) {
    return { data: await this.media.listForAdmin(code) };
  }

  @Post("centers/:code/media")
  @Roles("ADMINISTRADOR")
  async upload(
    @Param("code") code: string,
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
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
    return {
      data: await this.media.upload(user.id, code, {
        originalName: part.filename,
        mimeType: part.mimetype,
        buffer,
        typeCode: parseTypeCode(fieldText(part.fields?.typeCode)),
        description: fieldText(part.fields?.description),
        sourceAuthor: fieldText(part.fields?.sourceAuthor),
      }),
    };
  }

  @Delete("centers/:code/media/:id")
  @Roles("ADMINISTRADOR")
  async remove(
    @Param("code") code: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId < 1) {
      throw new BadRequestException(
        "El identificador de la fotografía no es válido.",
      );
    }
    return { data: await this.media.remove(user.id, code, mediaId) };
  }
}

@ApiTags("public-media")
@Controller("media")
export class PublicMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get(":id")
  async get(@Param("id") id: string, @Res() response: FastifyReply) {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId < 1) {
      throw new BadRequestException(
        "El identificador de la fotografía no es válido.",
      );
    }
    const file = await this.media.publicFile(mediaId);
    response
      .header("Content-Type", file.mimeType)
      .header("Cache-Control", "public, max-age=3600")
      .send(file.body);
  }
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
