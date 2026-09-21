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
  type AgentSource,
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
  PUBLIC_NEARBY_ESTABLISHMENT_SEARCH,
  type PublicNearbyEstablishmentSearch,
} from "./public-nearby-establishment-search";
import {
  PUBLIC_CENTER_REPOSITORY,
  type PublicCenterRepository,
} from "../../centers/application/public-center.repository";
import type {
  PublicCenter,
  PublicCenterDetail,
} from "../../centers/domain/public-center";
import { PUBLIC_POI_REPOSITORY } from "../../pois/application/public-poi.repository";
import type { PublicPoiRepository } from "../../pois/application/public-poi.repository";
import type { PublicPoi } from "../../pois/domain/public-poi";
import { PUBLIC_TRANSPORT_REPOSITORY } from "../../transport/application/public-transport.repository";
import type { PublicTransportRepository } from "../../transport/application/public-transport.repository";
import { CalculateRouteUseCase } from "../../routing/application/calculate-route.use-case";
import {
  NoRouteFoundError,
  RouteProviderUnavailableError,
} from "../../routing/domain/routing-errors";

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

export const nearbyPublishedPlacesInputSchema = z
  .object({
    radiusMeters: z.number().int().min(100).max(25_000).default(5_000),
    limit: z.number().int().min(1).max(8).default(6),
    category: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const transportForCenterInputSchema = z
  .object({
    code: z.string().trim().min(1).max(120),
  })
  .strict();

const nearbyTransportStopsInputSchema = z
  .object({
    radiusMeters: z.number().int().min(100).max(25_000).default(5_000),
    limit: z.number().int().min(1).max(8).default(6),
  })
  .strict();

export const calculateRoadRouteInputSchema = z
  .object({
    fromRef: z.string().trim().min(1).max(96).optional(),
    toRef: z.string().trim().min(1).max(96),
    mode: z.enum(["car", "bicycle", "foot"]),
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
    @Inject(PUBLIC_NEARBY_ESTABLISHMENT_SEARCH)
    private readonly nearbyEstablishments: PublicNearbyEstablishmentSearch,
    @Inject(PUBLIC_POI_REPOSITORY)
    private readonly pois: PublicPoiRepository,
    @Inject(PUBLIC_TRANSPORT_REPOSITORY)
    private readonly transport: PublicTransportRepository,
    @Inject(CalculateRouteUseCase)
    private readonly calculateRoute: CalculateRouteUseCase,
  ) {}

  async generate(input: AgentChatInput): Promise<AgentResponse> {
    const entities = new Map<string, TrustedAgentEntity>();
    const trustedSources = new Map<string, AgentSource>();
    const approximateLocation = input.location
      ? {
          latitude: roundCoordinate(input.location.latitude),
          longitude: roundCoordinate(input.location.longitude),
        }
      : undefined;
    const forceNearbyTool = hasNearbyIntent(input.message);
    let establishmentSequence = 0;
    let poiSequence = 0;

    const registerSource = (source: AgentSource) => {
      trustedSources.set(`${source.type}:${source.label}`, source);
    };

    const registerCenter = (
      ref: string,
      center: PublicCenter | PublicCenterDetail,
      sourceLabel: string,
      distanceMeters: number | null = null,
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
          distanceMeters,
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

    const registerPoi = (item: PublicPoi, sourceLabel: string) => {
      const ref = `poi:${++poiSequence}`;
      entities.set(ref, {
        ref,
        card: {
          type: "poi",
          name: item.name,
          summary: truncate(
            item.description?.trim() || `Punto de interés en ${item.zoneName}.`,
            500,
          ),
          category: "Punto de interés",
          localityName: item.localityName,
          latitude: item.latitude,
          longitude: item.longitude,
          distanceMeters: item.distanceMeters,
        },
        destination: {
          type: "poi",
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
        },
        source: { type: "poi", label: sourceLabel },
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
          "Usa las herramientas para consultar únicamente centros publicados, puntos de interés activos, establecimientos activos y transporte registrado.",
          "Cuando el visitante diga cerca, cercano, cerca de mí, lo que haya alrededor o use una intención equivalente, y haya ubicación aproximada, debes usar searchNearbyPublishedPlaces antes de cualquier búsqueda textual. Esa herramienta combina centros, puntos de interés y establecimientos; no intentes buscar la frase cerca de mí como texto.",
          "Cuando pidan un plan, paseo o recorrido de varias paradas, usa findItineraryCandidates y devuelve un itinerary de 2 a 6 centros publicados en el orden sugerido.",
          "El título y resumen del itinerary son una propuesta; no afirmes horarios, precios, disponibilidad, servicios ni duración sin una herramienta que los verifique.",
          "Para transporte usa getPublishedTransportForCenter o searchNearbyTransportStops cuando la pregunta lo requiera. Si no hay rutas, paradas u horarios publicados, dilo así; no inventes transporte, frecuencias, precios ni tiempos.",
          "Para calcular una ruta vial usa calculateRoadRoute después de obtener referencias confiables. Puede calcular desde la ubicación aproximada o entre dos lugares registrados; no le envíes coordenadas. Las métricas desde la ubicación son aproximadas y el móvil volverá a calcular la ruta antes de navegar.",
          "Si una herramienta no tiene datos o falla, dilo claramente y no rellenes el vacío con conocimiento externo.",
          "Para tarjetas, itineraries y acciones usa solamente las referencias ref devueltas por las herramientas.",
          "No pongas coordenadas ni códigos inventados en la salida estructurada.",
          "open_center solo sirve para centros publicados.",
          "start_route solo propone una ruta; nunca inicia navegación ni afirma que ya empezó. El móvil pedirá confirmación.",
          approximateLocation
            ? "Hay una ubicación aproximada disponible para búsquedas cercanas y paradas de transporte; úsala solo mediante las herramientas correspondientes."
            : "No hay ubicación disponible. Para consultas cercanas o paradas, pide activar ubicación o una localidad; no supongas dónde está el visitante.",
          "No solicites ni repitas contraseñas, tokens, ubicación histórica o datos personales.",
        ].join(" "),
        messages,
        prepareStep: ({ stepNumber }) =>
          forceNearbyTool && stepNumber === 0
            ? {
                toolChoice: {
                  type: "tool" as const,
                  toolName: "searchNearbyPublishedPlaces" as const,
                },
              }
            : { toolChoice: "auto" as const },
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
          searchNearbyPublishedPlaces: tool({
            description:
              "Busca todo lo publicado o activo dentro de un radio: centros turísticos, puntos de interés y establecimientos. El radio y el límite son filtros; la ubicación se toma del contexto de la solicitud y nunca debe enviarse como argumento.",
            inputSchema: nearbyPublishedPlacesInputSchema,
            execute: async ({ radiusMeters, limit, category }) => {
              if (!approximateLocation) {
                return {
                  available: false,
                  message:
                    "No hay ubicación disponible. Pide permiso de ubicación o una localidad antes de recomendar lugares cercanos.",
                };
              }

              try {
                const [centerResult, poiResult, establishmentResult] =
                  await Promise.all([
                    this.centers.listNearbyPublished({
                      latitude: approximateLocation.latitude,
                      longitude: approximateLocation.longitude,
                      radiusMeters,
                      category,
                      limit,
                    }),
                    this.pois.listNearby({
                      latitude: approximateLocation.latitude,
                      longitude: approximateLocation.longitude,
                      radiusMeters,
                      category,
                      limit,
                    }),
                    this.nearbyEstablishments.nearby({
                      latitude: approximateLocation.latitude,
                      longitude: approximateLocation.longitude,
                      radiusMeters,
                      category,
                      limit,
                    }),
                  ]);
                const sourceLabel = "Catálogo público geolocalizado";
                const results = [
                  ...centerResult.items.map((center) => {
                    const ref = registerCenter(
                      `center:${center.code}`,
                      center,
                      sourceLabel,
                      center.distanceMeters,
                    );
                    return {
                      ref,
                      type: "center" as const,
                      code: center.code,
                      name: center.name,
                      description: center.description,
                      category: center.category,
                      distanceMeters: center.distanceMeters,
                    };
                  }),
                  ...poiResult.items.map((item) => {
                    const ref = registerPoi(item, sourceLabel);
                    return {
                      ref,
                      type: "poi" as const,
                      name: item.name,
                      description: item.description,
                      category: "Punto de interés",
                      localityName: item.localityName,
                      distanceMeters: item.distanceMeters,
                    };
                  }),
                  ...establishmentResult.map((item) => {
                    const ref = registerEstablishment(item, sourceLabel);
                    return {
                      ref,
                      type: "establishment" as const,
                      name: item.nombreComercial,
                      description: [
                        item.actividad,
                        item.categoria ?? item.clasificacion,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      category: item.categoria ?? item.clasificacion,
                      localityName: item.localityName,
                      distanceMeters: item.distanceMeters,
                    };
                  }),
                ]
                  .sort(
                    (left, right) =>
                      (left.distanceMeters ?? Number.POSITIVE_INFINITY) -
                        (right.distanceMeters ?? Number.POSITIVE_INFINITY) ||
                      left.name.localeCompare(right.name),
                  )
                  .slice(0, limit);

                return {
                  available: true,
                  radiusMeters,
                  category: category ?? null,
                  total: results.length,
                  results,
                  source: sourceLabel,
                  ...(results.length === 0
                    ? {
                        message:
                          "No encontré lugares publicados dentro de este radio. Puedo buscar por ciudad, categoría o ampliar la distancia.",
                      }
                    : {}),
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
          getPublishedTransportForCenter: tool({
            description:
              "Consulta rutas, paradas, horarios y detalles de transporte registrados para un centro turístico publicado. No calcula una ruta vial ni inventa frecuencias.",
            inputSchema: transportForCenterInputSchema,
            execute: async ({ code }) => {
              try {
                const transport =
                  await this.transport.findForPublishedCenter(code);
                if (!transport) return { available: true, found: false };
                const source: AgentSource = {
                  type: "transport",
                  label: "Registro institucional de transporte",
                };
                registerSource(source);
                const hasData =
                  transport.routes.length > 0 ||
                  transport.details.length > 0 ||
                  transport.transportTypes.length > 0;
                return {
                  available: true,
                  found: true,
                  centerName: transport.centerName,
                  transportTypes: transport.transportTypes,
                  details: transport.details,
                  routes: transport.routes,
                  ...(hasData
                    ? {}
                    : {
                        message:
                          "No hay rutas ni horarios de transporte publicados para este centro.",
                      }),
                  source: source.label,
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
          searchNearbyTransportStops: tool({
            description:
              "Busca paradas de transporte activas dentro de un radio usando la ubicación aproximada del visitante. Solo devuelve paradas vinculadas a rutas activas.",
            inputSchema: nearbyTransportStopsInputSchema,
            execute: async ({ radiusMeters, limit }) => {
              if (!approximateLocation) {
                return {
                  available: false,
                  message:
                    "No hay ubicación disponible. Pide permiso de ubicación antes de buscar paradas cercanas.",
                };
              }
              try {
                const results = await this.transport.listNearbyStops({
                  latitude: approximateLocation.latitude,
                  longitude: approximateLocation.longitude,
                  radiusMeters,
                  limit,
                });
                const source: AgentSource = {
                  type: "transport",
                  label: "Registro institucional de paradas y rutas",
                };
                registerSource(source);
                return {
                  available: true,
                  radiusMeters,
                  total: results.length,
                  results,
                  source: source.label,
                  ...(results.length === 0
                    ? {
                        message:
                          "No hay paradas de transporte publicadas dentro de este radio.",
                      }
                    : {}),
                };
              } catch {
                return genericToolFailure;
              }
            },
          }),
          calculateRoadRoute: tool({
            description:
              "Calcula una ruta vial real sin tráfico en tiempo real entre dos referencias confiables. Si fromRef se omite, usa la ubicación aproximada del visitante como origen. Nunca recibe coordenadas.",
            inputSchema: calculateRoadRouteInputSchema,
            execute: async ({ fromRef, toRef, mode }) => {
              const destination = entities.get(toRef)?.destination;
              if (!destination) {
                return {
                  available: true,
                  found: false,
                  message:
                    "No encontré un destino confiable para calcular esta ruta.",
                };
              }

              const originEntity = fromRef ? entities.get(fromRef) : undefined;
              if (fromRef && !originEntity?.destination) {
                return {
                  available: true,
                  found: false,
                  message:
                    "No encontré un origen confiable para calcular esta ruta.",
                };
              }
              if (!fromRef && !approximateLocation) {
                return {
                  available: false,
                  message:
                    "No hay ubicación disponible. Pide permiso de ubicación antes de calcular una ruta desde el visitante.",
                };
              }

              const origin = originEntity?.destination ?? approximateLocation;
              if (!origin) {
                return genericToolFailure;
              }
              const originCoordinate = {
                latitude: origin.latitude,
                longitude: origin.longitude,
              };
              const destinationCoordinate = {
                latitude: destination.latitude,
                longitude: destination.longitude,
              };
              if (
                originCoordinate.latitude === destinationCoordinate.latitude &&
                originCoordinate.longitude === destinationCoordinate.longitude
              ) {
                return {
                  available: true,
                  found: false,
                  message:
                    "El origen y el destino son el mismo punto; no hay una ruta vial que calcular.",
                };
              }

              try {
                const route = await this.calculateRoute.execute({
                  destination: destinationCoordinate,
                  mode,
                  origin: originCoordinate,
                });
                if (
                  !Number.isFinite(route.distanceMeters) ||
                  route.distanceMeters < 0 ||
                  !Number.isFinite(route.durationSeconds) ||
                  route.durationSeconds < 0
                ) {
                  return genericToolFailure;
                }

                const source: AgentSource = {
                  type: "routing",
                  label: "Cálculo de ruta vial",
                };
                registerSource(source);
                return {
                  available: true,
                  found: true,
                  mode,
                  from:
                    originEntity?.destination?.name ??
                    "Tu ubicación aproximada",
                  to: destination.name,
                  distanceMeters: route.distanceMeters,
                  durationSeconds: route.durationSeconds,
                  instructions: route.steps
                    .slice(0, 8)
                    .map((step) => step.instruction),
                  source: source.label,
                  approximateOrigin: !fromRef,
                };
              } catch (error) {
                if (error instanceof NoRouteFoundError) {
                  return {
                    available: true,
                    found: false,
                    message:
                      "No encontré una ruta vial posible entre esos lugares.",
                  };
                }
                if (error instanceof RouteProviderUnavailableError) {
                  return {
                    available: false,
                    message:
                      "El servicio de rutas no está disponible ahora. No puedo verificar distancia ni duración.",
                  };
                }
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

      return sanitizeAgentResponse(result.output, entities, [
        ...trustedSources.values(),
      ]);
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

export function hasNearbyIntent(message: string): boolean {
  return /\b(cerca|cercan[oa]s?|alrededor|pr[oó]xim[oa]s?|aqu[ií] cerca)\b/i.test(
    message,
  );
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
