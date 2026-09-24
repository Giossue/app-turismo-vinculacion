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
import { RouteConfig } from "@nestjs/platform-fastify";

import { CurrentUser, Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { RolesGuard } from "../../auth/roles.guard";
import { AgentHistoryService } from "../application/agent-history.service";

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
  constructor(
    @Inject(AiAgentService) private readonly agent: AiAgentService,
    @Inject(AgentHistoryService) private readonly history: AgentHistoryService,
  ) {}

  @Post("chat")
  @RouteConfig({ rateLimit: { max: 30, timeWindow: "1 minute" } })
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
  async chat(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }
    const result = agentResponseSchema.parse(
      await this.agent.generate(parsed.data),
    );
    return this.withHistory(user.id, parsed.data, result);
  }

  @Post("chat/stream")
  @RouteConfig({ rateLimit: { max: 30, timeWindow: "1 minute" } })
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
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }

    response.hijack();
    const abortController = new AbortController();
    const abortOnClose = () => {
      if (!response.raw.writableEnded) abortController.abort();
    };
    response.raw.once("close", abortOnClose);

    try {
      if (response.raw.destroyed) return;
      response.raw.writeHead(200, {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      });
      const result = await this.agent.generate(
        parsed.data,
        async (text) => {
          if (abortController.signal.aborted) return;
          writeSseEvent(response.raw, { type: "text-delta", text });
        },
        abortController.signal,
      );
      if (abortController.signal.aborted) return;
      const finalResponse = await this.withHistory(
        user.id,
        parsed.data,
        agentResponseSchema.parse(result),
      );
      writeSseEvent(response.raw, {
        type: "complete",
        response: finalResponse,
      });
      writeSseEvent(response.raw, "[DONE]");
    } catch {
      if (
        !abortController.signal.aborted &&
        !response.raw.destroyed &&
        !response.raw.writableEnded
      ) {
        writeSseEvent(response.raw, {
          type: "error",
          message: "El agente no está disponible en este momento.",
        });
      }
    } finally {
      response.raw.off("close", abortOnClose);
      if (!response.raw.destroyed && !response.raw.writableEnded) {
        response.raw.end();
      }
    }
  }

  private async withHistory(
    userId: number,
    input: { message: string; conversationId?: string },
    response: ReturnType<typeof agentResponseSchema.parse>,
  ) {
    try {
      const conversationId = await this.history.recordTurn(
        userId,
        input.conversationId,
        input.message,
        response,
      );
      return conversationId ? { ...response, conversationId } : response;
    } catch {
      return { ...response, historySaveError: true };
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
