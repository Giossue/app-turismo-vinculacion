import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

import {
  AiAgentService,
  agentChatSchema,
} from "../application/ai-agent.service";

@ApiTags("ai-agent")
@Controller("ai")
export class AiAgentController {
  constructor(private readonly agent: AiAgentService) {}

  @Post("chat")
  @ApiOkResponse({
    description: "Respuesta de texto en streaming del agente turístico.",
  })
  async chat(@Body() body: unknown, @Res() reply: FastifyReply): Promise<void> {
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }
    const result = this.agent.stream(parsed.data);
    reply.hijack();
    reply.raw.setHeader("Content-Type", "text/plain; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("X-Content-Type-Options", "nosniff");
    try {
      for await (const chunk of result.textStream) reply.raw.write(chunk);
      reply.raw.end();
    } catch (error) {
      reply.raw.end();
      throw error;
    }
  }
}
