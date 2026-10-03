import {
  BadRequestException,
  Controller,
  Inject,
  Logger,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RouteConfig } from "@nestjs/platform-fastify";
import type { FastifyRequest } from "fastify";

import { Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import {
  AgentMediaService,
  agentAudioMaxBytes,
} from "../application/agent-media.service";

const logger = new Logger("AgentMediaController");

@ApiTags("ai-agent")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("TURISTA", "ADMINISTRADOR")
@Controller("ai/media")
export class AgentMediaController {
  constructor(
    @Inject(AgentMediaService) private readonly media: AgentMediaService,
  ) {}

  @Post("transcribe")
  @RouteConfig({ rateLimit: { max: 8, timeWindow: "1 minute" } })
  async transcribe(@Req() request: FastifyRequest) {
    const file = await readFile(request, agentAudioMaxBytes);
    logger.log(
      `Transcription request: ${file.mimeType}, ${file.buffer.length} bytes`,
    );
    return {
      data: await this.media.transcribeAudio(file.buffer, file.mimeType),
    };
  }
}

async function readFile(request: FastifyRequest, maxBytes: number) {
  let part;
  try {
    part = await request.file({
      limits: { fileSize: maxBytes, files: 1, fields: 0, parts: 1 },
    });
  } catch (error) {
    logger.warn(`Transcription upload rejected: ${String(error)}`);
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  if (!part) throw new BadRequestException("Debes seleccionar un archivo.");
  let buffer: Buffer;
  try {
    buffer = await part.toBuffer();
  } catch {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  if (part.file.truncated || buffer.length === 0 || buffer.length > maxBytes) {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  return { buffer, mimeType: part.mimetype };
}
