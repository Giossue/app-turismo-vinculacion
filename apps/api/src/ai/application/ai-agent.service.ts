import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  stepCountIs,
  streamText,
  tool,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";

import {
  PUBLIC_CENTER_REPOSITORY,
  type PublicCenterRepository,
} from "../../centers/application/public-center.repository";
const searchInputSchema = z.object({
  text: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(8).default(5),
});

export const agentChatSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2_000),
      }),
    )
    .max(12)
    .default([]),
});

export type AgentChatInput = z.infer<typeof agentChatSchema>;

@Injectable()
export class AiAgentService {
  constructor(
    private readonly config: ConfigService,
    @Inject(PUBLIC_CENTER_REPOSITORY)
    private readonly centers: PublicCenterRepository,
  ) {}

  stream(input: AgentChatInput) {
    const messages: ModelMessage[] = [
      ...input.history.map(
        (item) => ({ role: item.role, content: item.content }) as ModelMessage,
      ),
      { role: "user", content: input.message },
    ];
    return streamText({
      model: this.model(),
      system: [
        "Eres el agente turístico institucional de Turismo Vinculación.",
        "Responde en español salvo que el visitante pida inglés.",
        "Solo puedes recomendar información devuelta por searchPublishedCenters, que consulta fichas aprobadas.",
        "No inventes horarios, precios, coordenadas, disponibilidad ni servicios.",
        "Si no hay resultados, dilo claramente y sugiere cambiar los criterios.",
        "No solicites ni repitas contraseñas, tokens, ubicación histórica o datos personales.",
        "Cuando recomiendes un lugar, menciona su código turístico como referencia pública.",
      ].join(" "),
      messages,
      stopWhen: stepCountIs(3),
      tools: {
        searchPublishedCenters: tool({
          description:
            "Busca atractivos turísticos publicados y aprobados por nombre o descripción.",
          inputSchema: searchInputSchema,
          execute: async ({ text, limit }) => {
            const result = await this.centers.listPublished({ text, limit });
            return {
              total: result.total,
              results: result.items.map((center) => ({
                code: center.code,
                name: center.name,
                description: center.description,
                category: center.category,
                type: center.type,
                subtype: center.subtype,
                hierarchy: center.hierarchy,
              })),
              source: "fichas turísticas publicadas",
            };
          },
        }),
      },
    });
  }

  private model(): LanguageModel {
    const provider = this.config.getOrThrow<string>("AI_PROVIDER");
    const modelId = this.config.getOrThrow<string>("AI_MODEL");
    if (provider === "openai") {
      const apiKey = this.config.get<string>("OPENAI_API_KEY");
      if (!apiKey)
        throw new ServiceUnavailableException(
          "El proveedor de IA no está configurado.",
        );
      return createOpenAI({ apiKey })(modelId);
    }
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey)
      throw new ServiceUnavailableException(
        "El proveedor de IA no está configurado.",
      );
    return createAnthropic({ apiKey })(modelId);
  }
}
