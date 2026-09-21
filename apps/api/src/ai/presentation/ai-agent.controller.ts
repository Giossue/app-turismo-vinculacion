import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

import { Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import { RolesGuard } from "../../auth/roles.guard";

import {
  AiAgentService,
  agentChatSchema,
} from "../application/ai-agent.service";
import { agentResponseSchema } from "../application/ai-agent.contracts";

@ApiTags("ai-agent")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("TURISTA", "ADMINISTRADOR")
@Controller("ai")
export class AiAgentController {
  constructor(@Inject(AiAgentService) private readonly agent: AiAgentService) {}

  @Post("chat")
  @ApiOkResponse({
    description:
      "Respuesta estructurada con texto, tarjetas, acciones propuestas y fuentes.",
    schema: {
      type: "object",
      required: ["text", "cards", "actions", "sources"],
      properties: {
        text: { type: "string" },
        cards: { type: "array", items: { type: "object" } },
        actions: { type: "array", items: { type: "object" } },
        itinerary: {
          type: "object",
          nullable: true,
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            stops: { type: "array", items: { type: "object" } },
          },
        },
        sources: { type: "array", items: { type: "object" } },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "El mensaje o ubicación no es válido.",
  })
  @ApiServiceUnavailableResponse({
    description: "El proveedor o el catálogo del agente no está disponible.",
  })
  async chat(@Body() body: unknown) {
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }
    return agentResponseSchema.parse(await this.agent.generate(parsed.data));
  }

  @Post("chat/stream")
  @ApiProduces("text/event-stream")
  @ApiOkResponse({
    description:
      "Eventos SSE con texto parcial acumulado y la respuesta estructurada final.",
  })
  @ApiBadRequestResponse({
    description: "El mensaje o ubicación no es válido.",
  })
  @ApiServiceUnavailableResponse({
    description: "El proveedor o el catálogo del agente no está disponible.",
  })
  async chatStream(
    @Body() body: unknown,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }

    response.hijack();
    response.raw.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    });

    try {
      const result = await this.agent.generate(parsed.data, async (text) => {
        writeSseEvent(response.raw, { type: "text-delta", text });
      });
      const finalResponse = agentResponseSchema.parse(result);
      writeSseEvent(response.raw, {
        type: "complete",
        response: finalResponse,
      });
      writeSseEvent(response.raw, "[DONE]");
    } catch {
      if (!response.raw.destroyed && !response.raw.writableEnded) {
        writeSseEvent(response.raw, {
          type: "error",
          message: "El agente no está disponible en este momento.",
        });
      }
    } finally {
      if (!response.raw.writableEnded) response.raw.end();
    }
  }
}

function writeSseEvent(response: FastifyReply["raw"], payload: unknown): void {
  if (response.destroyed || response.writableEnded) {
    throw new Error("La conexión del agente fue cerrada.");
  }
  const data = payload === "[DONE]" ? "[DONE]" : JSON.stringify(payload);
  response.write(`data: ${data}\n\n`);
}
