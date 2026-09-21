import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";

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
}
