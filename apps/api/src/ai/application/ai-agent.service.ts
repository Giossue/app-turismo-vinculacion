import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  generateText,
  Output,
  stepCountIs,
  tool,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";

import {
  agentChatSchema,
  agentModelResponseSchema,
  type AgentChatInput,
  type AgentResponse,
} from "./ai-agent.contracts";
import {
  sanitizeAgentResponse,
  type TrustedAgentEntity,
} from "../infrastructure/ai-agent-trusted-data";
import {
  PUBLIC_ESTABLISHMENT_SEARCH,
  type PublicEstablishmentSearch,
  type PublicEstablishmentSearchItem,
} from "./public-establishment-search";
import {
  PUBLIC_CENTER_REPOSITORY,
  type PublicCenterRepository,
} from "../../centers/application/public-center.repository";
import type {
  PublicCenter,
  PublicCenterDetail,
} from "../../centers/domain/public-center";

const searchCentersInputSchema = z
  .object({
    text: z.string().trim().min(2).max(120),
    limit: z.number().int().min(1).max(8).default(5),
  })
  .strict();

const getCenterInputSchema = z
  .object({
    code: z.string().trim().min(1).max(120),
  })
  .strict();

const nearbyEstablishmentsInputSchema = z
  .object({
    activity: z.string().trim().min(2).max(120),
    category: z.string().trim().min(1).max(120).optional(),
    limit: z.number().int().min(1).max(8).default(5),
  })
  .strict();

const itineraryCandidatesInputSchema = z
  .object({
    text: z.string().trim().min(2).max(120),
    limit: z.number().int().min(2).max(6).default(4),
  })
  .strict();

const genericToolFailure = {
  available: false,
  message:
    "No se pudo verificar esta consulta en el catálogo público. No inventes resultados y comunícalo claramente.",
} as const;

export { agentChatSchema };
export type { AgentChatInput };

@Injectable()
export class AiAgentService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(PUBLIC_CENTER_REPOSITORY)
    private readonly centers: PublicCenterRepository,
    @Inject(PUBLIC_ESTABLISHMENT_SEARCH)
    private readonly establishments: PublicEstablishmentSearch,
  ) {}

  async generate(input: AgentChatInput): Promise<AgentResponse> {
    const entities = new Map<string, TrustedAgentEntity>();
    const approximateLocation = input.location
      ? {
          latitude: roundCoordinate(input.location.latitude),
          longitude: roundCoordinate(input.location.longitude),
        }
      : undefined;
    let establishmentSequence = 0;

    const registerCenter = (
      ref: string,
      center: PublicCenter | PublicCenterDetail,
      sourceLabel: string,
    ) => {
      const summary = truncate(
        center.description?.trim() ||
          `${center.type} turístico publicado en el catálogo institucional.`,
        500,
      );
      entities.set(ref, {
        ref,
        card: {
          type: "center",
          code: center.code,
          name: center.name,
          summary,
          category: center.category,
          latitude: center.latitude,
          longitude: center.longitude,
          distanceMeters: null,
        },
        destination: {
          type: "center",
          code: center.code,
          name: center.name,
          latitude: center.latitude,
          longitude: center.longitude,
        },
        source: { type: "center", label: sourceLabel },
      });
      return ref;
    };

    const registerEstablishment = (
      item: PublicEstablishmentSearchItem,
      sourceLabel: string,
    ) => {
      const ref = `establishment:${++establishmentSequence}`;
      const category = item.categoria ?? item.clasificacion;
      const summary = truncate(
        [item.actividad, category].filter(Boolean).join(" · ") ||
          "Establecimiento turístico del catastro público.",
        500,
      );
      const hasCoordinates =
        item.latitude !== null &&
        item.longitude !== null &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude);
      entities.set(ref, {
        ref,
        card: {
          type: "establishment",
          name: item.nombreComercial,
          summary,
          category,
          address: item.direccion,
          phone: item.telefono,
          localityName: item.localityName,
          latitude: item.latitude,
          longitude: item.longitude,
          distanceMeters: item.distanceMeters,
        },
        destination: hasCoordinates
          ? {
              type: "establishment",
              name: item.nombreComercial,
              latitude: item.latitude!,
              longitude: item.longitude!,
            }
          : null,
        source: { type: "establishment", label: sourceLabel },
      });
      return ref;
    };

    const messages: ModelMessage[] = [
      ...input.history.map(
        (item) => ({ role: item.role, content: item.content }) as ModelMessage,
      ),
      { role: "user", content: input.message },
    ];

    try {
      const result = await generateText({
        model: this.model(),
        system: [
          "Eres el agente turístico institucional de Turismo Vinculación.",
          "Responde en español salvo que el visitante pida inglés.",
          "Usa las herramientas para consultar únicamente centros y establecimientos publicados.",
          "Cuando pidan un plan, paseo o recorrido de varias paradas, usa findItineraryCandidates y devuelve un itinerary de 2 a 6 centros publicados en el orden sugerido.",
          "El título y resumen del itinerary son una propuesta; no afirmes horarios, precios, disponibilidad, servicios ni duración sin una herramienta que los verifique.",
          "Si una herramienta no tiene datos o falla, dilo claramente y no rellenes el vacío con conocimiento externo.",
          "Para tarjetas, itineraries y acciones usa solamente las referencias ref devueltas por las herramientas.",
          "No pongas coordenadas ni códigos inventados en la salida estructurada.",
          "open_center solo sirve para centros publicados.",
          "start_route solo propone una ruta; nunca inicia navegación ni afirma que ya empezó. El móvil pedirá confirmación.",
          approximateLocation
            ? "Hay una ubicación aproximada disponible para búsquedas cercanas; úsala solo mediante la herramienta de catastro."
            : "No hay ubicación disponible. Para consultas cercanas, pide activar ubicación o una localidad; no supongas dónde está el visitante.",
          "No solicites ni repitas contraseñas, tokens, ubicación histórica o datos personales.",
        ].join(" "),
        messages,
        output: Output.object({
          schema: agentModelResponseSchema,
          name: "tourism_agent_response",
          description:
            "Respuesta turística con texto y referencias verificables a resultados de herramientas.",
        }),
        stopWhen: stepCountIs(4),
        maxOutputTokens:
          this.config.get<number>("AI_MAX_OUTPUT_TOKENS") ?? 1_200,
        timeout: this.config.get<number>("AI_REQUEST_TIMEOUT_MS") ?? 30_000,
        tools: {
          searchPublishedCenters: tool({
            description:
              "Busca atractivos turísticos publicados y aprobados por nombre, descripción o categoría.",
            inputSchema: searchCentersInputSchema,
            execute: async ({ text, limit }) => {
              try {
                const result = await this.centers.listPublished({
                  text,
                  limit,
                });
                return {
                  total: result.total,
                  results: result.items.map((center) => {
                    const ref = registerCenter(
                      `center:${center.code}`,
                      center,
                      "Catálogo de centros turísticos publicados",
                    );
                    return {
                      ref,
                      code: center.code,
                      name: center.name,
                      description: center.description,
                      category: center.category,
                      type: center.type,
                      subtype: center.subtype,
                      hierarchy: center.hierarchy,
                    };
                  }),
                  source: "Catálogo de centros turísticos publicados",
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
          findItineraryCandidates: tool({
            description:
              "Busca entre 2 y 6 lugares turísticos publicados que puedan formar una propuesta de recorrido. No calcula horarios, duración ni rutas.",
            inputSchema: itineraryCandidatesInputSchema,
            execute: async ({ text, limit }) => {
              try {
                const result = await this.centers.listPublished({
                  text,
                  limit,
                });
                return {
                  total: result.total,
                  results: result.items.map((center) => {
                    const ref = registerCenter(
                      `center:${center.code}`,
                      center,
                      "Candidatos de recorrido del catálogo publicado",
                    );
                    return {
                      ref,
                      code: center.code,
                      name: center.name,
                      description: center.description,
                      category: center.category,
                      type: center.type,
                      subtype: center.subtype,
                    };
                  }),
                  source: "Candidatos de recorrido del catálogo publicado",
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
          getPublishedCenter: tool({
            description:
              "Obtiene la ficha pública detallada de un centro publicado usando su código.",
            inputSchema: getCenterInputSchema,
            execute: async ({ code }) => {
              try {
                const center = await this.centers.findPublishedByCode(code);
                if (!center) return { found: false };
                const ref = registerCenter(
                  `center:${center.code}`,
                  center,
                  `Ficha pública de ${center.name}`,
                );
                return {
                  found: true,
                  ref,
                  code: center.code,
                  name: center.name,
                  description: center.description,
                  category: center.category,
                  type: center.type,
                  subtype: center.subtype,
                  touristZone: center.touristZone,
                  address: center.address,
                  altitudeMeters: center.altitudeMeters,
                  admission: center.admission,
                  activities: center.activities.slice(0, 12),
                  accessibility: center.accessibility.slice(0, 12),
                  facilities: center.facilities.slice(0, 12),
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
          searchNearbyEstablishments: tool({
            description:
              "Busca establecimientos turísticos públicos del catastro por actividad y categoría, priorizando la ubicación aproximada del visitante.",
            inputSchema: nearbyEstablishmentsInputSchema,
            execute: async ({ activity, category, limit }) => {
              if (!approximateLocation) {
                return {
                  available: false,
                  message:
                    "No hay ubicación disponible. Pide permiso de ubicación o una localidad antes de recomendar cercanía.",
                };
              }
              try {
                const result = await this.establishments.nearby({
                  activity,
                  category,
                  latitude: approximateLocation.latitude,
                  longitude: approximateLocation.longitude,
                  limit,
                });
                const sourceLabel = result.effectiveLocality
                  ? `Catastro turístico público de ${result.effectiveLocality.name}`
                  : "Catastro turístico público";
                return {
                  available: true,
                  fallbackApplied: result.fallbackApplied,
                  requestedLocalityName: result.requestedLocalityName,
                  effectiveLocality: result.effectiveLocality,
                  results: result.items.map((item) => ({
                    ref: registerEstablishment(item, sourceLabel),
                    name: item.nombreComercial,
                    activity: item.actividad,
                    classification: item.clasificacion,
                    category: item.categoria,
                    address: item.direccion,
                    phone: item.telefono,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    distanceMeters: item.distanceMeters,
                    localityName: item.localityName,
                  })),
                  source: sourceLabel,
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
        },
      });

      return sanitizeAgentResponse(result.output, entities);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        "El agente no está disponible en este momento.",
      );
    }
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

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trim()}…`;
}
