import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
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
  agentTravelTimesSchema,
  type AgentChatInput,
  type AgentResponse,
  type AgentSource,
} from "./ai-agent.contracts";
import {
  enrichAgentCenterLocations,
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
import type { TravelTimeEstimate } from "../../routing/domain/route";

const searchCentersInputSchema = z
  .object({
    text: z.string().trim().min(2).max(120),
    limit: z.number().int().min(1).max(8).default(5),
  })
  .strict();

const listCentersInputSchema = z
  .object({
    locality: z.string().trim().min(2).max(120).optional(),
    limit: z.number().int().min(1).max(8).default(6),
  })
  .strict();

const publishedCentersSource = "Catálogo de centros turísticos publicados";
const publishedEstablishmentsSource = "Catastro turístico público";

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

const browseEstablishmentsInputSchema = z
  .object({
    kind: z.enum(["food", "lodging", "other"]),
    text: z.string().trim().min(2).max(120).optional(),
    locality: z.string().trim().min(2).max(120).optional(),
    limit: z.number().int().min(1).max(8).default(6),
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

export const getTravelTimesInputSchema = z
  .object({
    refs: z.array(z.string().trim().min(1).max(96)).min(1).max(6),
  })
  .strict();

const genericToolFailure = {
  available: false,
  message: "No pude consultar esa información ahora. Inténtalo de nuevo.",
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

  async generate(
    input: AgentChatInput,
    onText?: (text: string) => Promise<void> | void,
    abortSignal?: AbortSignal,
    options: Readonly<{ includeCenterLocations?: boolean }> = {},
  ): Promise<AgentResponse> {
    const entities = new Map<string, TrustedAgentEntity>();
    const registeredCenters = new Map<
      string,
      PublicCenter | PublicCenterDetail
    >();
    const finishAnswer = (answer: AgentResponse) =>
      options.includeCenterLocations === true
        ? enrichAgentCenterLocations(
            answer,
            this.centers,
            registeredCenters,
            abortSignal,
          )
        : answer;
    const trustedSources = new Map<string, AgentSource>();
    const approximateLocation = input.location
      ? {
          latitude: roundCoordinate(input.location.latitude),
          longitude: roundCoordinate(input.location.longitude),
        }
      : undefined;
    const forceNearbyTool = hasNearbyIntent(input.message);
    const needsCurrentLocation =
      (forceNearbyTool || hasTravelTimeIntent(input.message)) &&
      !approximateLocation;
    const forceGeneralCatalogTool =
      !forceNearbyTool && hasGeneralDiscoveryIntent(input.message);
    const forceEstablishmentKind =
      !forceNearbyTool && !forceGeneralCatalogTool
        ? getEstablishmentDiscoveryKind(input.message)
        : null;
    let generalCatalogRefs: string[] | null = null;
    let generalCatalogFailed = false;
    let establishmentBrowseRefs: string[] | null = null;
    let establishmentBrowseFailed = false;
    let establishmentSequence = 0;
    let poiSequence = 0;
    const travelTimeCache = new Map<
      string,
      Promise<readonly TravelTimeEstimate[]>
    >();

    const registerSource = (source: AgentSource) => {
      trustedSources.set(`${source.type}:${source.label}`, source);
    };

    const registerCenter = (
      ref: string,
      center: PublicCenter | PublicCenterDetail,
      sourceLabel: string,
      distanceMeters: number | null = null,
    ) => {
      registeredCenters.set(center.code, center);
      const summary = truncate(
        center.description?.trim() || `${center.type}.`,
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
          "Establecimiento turístico.",
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

    // Reserve destinations before awaiting to bound concurrent tool calls and
    // reuse the same estimates when a destination appears in several searches.
    const attachTravelTimes = async (refs: readonly string[]) => {
      if (!approximateLocation || abortSignal?.aborted) return;
      const selected = [...new Set(refs)]
        .map((ref) => entities.get(ref))
        .filter((entity): entity is TrustedAgentEntity => Boolean(entity));
      selected
        .filter((entity) => !entity.destination)
        .forEach((entity) => {
          entities.set(entity.ref, {
            ...entity,
            card: { ...entity.card, travelTimes: unavailableTravelTimes() },
          });
        });
      const destinations = selected.filter((entity) => entity.destination);
      const pending = new Map<
        string,
        NonNullable<TrustedAgentEntity["destination"]>
      >();
      for (const entity of destinations) {
        const destination = entity.destination!;
        const key = `${destination.latitude},${destination.longitude}`;
        if (
          !travelTimeCache.has(key) &&
          !pending.has(key) &&
          travelTimeCache.size + pending.size < 6
        ) {
          pending.set(key, destination);
        }
      }
      if (pending.size > 0) {
        const batch = Promise.resolve()
          .then(() =>
            this.calculateRoute.estimateTravelTimes(
              {
                origin: approximateLocation,
                destinations: [...pending.values()].map(
                  ({ latitude, longitude }) => ({ latitude, longitude }),
                ),
              },
              abortSignal,
            ),
          )
          .catch(() => []);
        [...pending.keys()].forEach((key, index) => {
          travelTimeCache.set(
            key,
            batch.then((rows) => {
              const parsed = agentTravelTimesSchema.safeParse(rows[index]);
              return parsed.success ? parsed.data : unavailableTravelTimes();
            }),
          );
        });
      }
      await Promise.all(
        destinations.map(async (entity) => {
          const destination = entity.destination!;
          const key = `${destination.latitude},${destination.longitude}`;
          const travelTimes = await (travelTimeCache.get(key) ??
            unavailableTravelTimes());
          if (abortSignal?.aborted) return;
          const current = entities.get(entity.ref);
          if (!current) return;
          entities.set(entity.ref, {
            ...current,
            card: { ...current.card, travelTimes: [...travelTimes] },
          });
          if (travelTimes.some((estimate) => estimate.status === "available")) {
            registerSource({
              type: "routing",
              label: "Tiempos estimados de llegada por caminos",
            });
          }
        }),
      );
    };

    const messages: ModelMessage[] = [
      ...input.history.map(
        (item) => ({ role: item.role, content: item.content }) as ModelMessage,
      ),
      { role: "user", content: input.message },
    ];

    try {
      const result = streamText({
        abortSignal,
        model: this.model(),
        system: [
          "Eres el guía turístico de Turismo Vinculación. Ayudas al visitante a elegir lugares, comer, hospedarse y llegar a su destino.",
          "Responde en español salvo que el visitante pida inglés.",
          "Habla de forma natural, amable y práctica. Responde a la pregunta en una a tres frases breves por defecto; amplía solo si el visitante pide detalle o la respuesta lo necesita.",
          "En text habla del lugar y de lo que le sirve al visitante, sin narrar cómo consultaste la información. No menciones catastro, fichas, catálogo, base de datos, herramientas, registros internos ni fuentes como explicación de tus recomendaciones. Evita frases como lo saqué del catastro, según la ficha o datos publicados. Las referencias de fuentes se conservan internamente, no se enumeran en text.",
          "No añadas introducciones genéricas, explicaciones de la app, ofrecimientos repetidos ni una pregunta al final por costumbre. Pregunta solo si necesitas un dato para responder, con una sola pregunta concreta.",
          "Usa las herramientas para consultar únicamente centros publicados, puntos de interés activos, establecimientos activos y transporte registrado.",
          "Descubrir lugares turísticos en general no requiere GPS. Para preguntas generales como qué lugares turísticos puedo visitar, usa listPublishedCenters y presenta los lugares encontrados; la ciudad o los intereses son filtros opcionales, no una pregunta obligatoria.",
          "Para preguntas generales sobre dónde comer u hospedarse sin intención de cercanía, usa searchPublishedEstablishments. La ubicación y localidad son opcionales; sin ellas ofrece resultados publicados sin afirmar que están cerca. Si el visitante indica una localidad, úsala como filtro.",
          "Cuando el visitante diga cerca, cercano, cerca de mí, lo que haya alrededor o use una intención equivalente, y haya ubicación aproximada, debes usar searchNearbyPublishedPlaces antes de cualquier búsqueda textual. Esa herramienta combina centros, puntos de interés y establecimientos; no intentes buscar la frase cerca de mí como texto.",
          "Si una consulta cercana no tiene ubicación, usa requestLocationAccess. Esa herramienta solo propone una acción para que el móvil solicite o actualice la ubicación; no otorga permisos ni accede al GPS del teléfono.",
          "La función de planes e itinerarios está retirada. Si solicitan un plan de viaje o un recorrido de varias paradas, explica que no está disponible y ofrece buscar lugares o preparar una ruta a un destino; no generes un itinerario ni prometas guardarlo.",
          "Para transporte usa getPublishedTransportForCenter o searchNearbyTransportStops cuando la pregunta lo requiera. Si faltan rutas, paradas u horarios, di brevemente qué información no tienes; no afirmes que no existen ni inventes transporte, frecuencias, precios o tiempos.",
          "Para calcular una ruta vial usa calculateRoadRoute después de obtener referencias confiables. Puede calcular desde la ubicación aproximada o entre dos lugares registrados; no le envíes coordenadas. Las métricas desde la ubicación son aproximadas y el móvil volverá a calcular la ruta antes de navegar.",
          "Las búsquedas con ubicación incluyen travelTimes por carro, a pie y bicicleta desde el visitante. Para consultar esos tiempos usa getTravelTimes con las referencias obtenidas; el origen se toma de la solicitud. Solo status available tiene tiempo y distancia por caminos verificados. No conviertas distanceMeters de cercanía en minutos ni inventes velocidades. Los tiempos son estimados sin tráfico en tiempo real; no_route significa sin ruta y unavailable significa que no se pudo verificar ese modo.",
          "Si una herramienta no tiene datos o falla, dilo con una frase natural como No encontré opciones con esa búsqueda o Ahora no puedo consultar esos lugares. No describas procesos internos ni rellenes el vacío con conocimiento externo.",
          "Para tarjetas y acciones usa solamente las referencias ref devueltas por las herramientas.",
          "Si incluyes tarjetas de lugares, no repitas la lista de nombres, categorías, direcciones, distancias ni tiempos en text. Usa una frase breve que responda a la intención, por ejemplo Aquí tienes opciones para comer. Añade un criterio o una limitación solo cuando ayude a elegir; cada lugar y sus tiempos se presentan en su tarjeta.",
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
          needsCurrentLocation && stepNumber === 0
            ? {
                toolChoice: {
                  type: "tool" as const,
                  toolName: "requestLocationAccess" as const,
                },
              }
            : forceNearbyTool && stepNumber === 0
              ? {
                  toolChoice: {
                    type: "tool" as const,
                    toolName: "searchNearbyPublishedPlaces" as const,
                  },
                }
              : forceGeneralCatalogTool && stepNumber === 0
                ? {
                    toolChoice: {
                      type: "tool" as const,
                      toolName: "listPublishedCenters" as const,
                    },
                  }
                : forceEstablishmentKind && stepNumber === 0
                  ? {
                      toolChoice: {
                        type: "tool" as const,
                        toolName: "searchPublishedEstablishments" as const,
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
          getTravelTimes: tool({
            description:
              "Consulta tiempos estimados y distancias por caminos en carro, a pie y bicicleta desde la ubicación aproximada del visitante hacia hasta seis lugares obtenidos de otras herramientas. Solo acepta referencias confiables, nunca coordenadas ni minutos escritos por el modelo.",
            inputSchema: getTravelTimesInputSchema,
            execute: async ({ refs }) => {
              if (!approximateLocation) {
                return {
                  available: false,
                  clientAction: "request_location" as const,
                  message:
                    "Necesito tu ubicación actual para calcular los tiempos de llegada.",
                };
              }
              if (refs.some((ref) => !entities.has(ref))) {
                return {
                  available: true,
                  found: false,
                  message:
                    "No encontré esos destinos para calcular cuánto tardas en llegar.",
                };
              }
              await attachTravelTimes(refs);
              return {
                available: true,
                approximateOrigin: true,
                liveTraffic: false,
                results: [...new Set(refs)].map((ref) => {
                  const entity = entities.get(ref)!;
                  return {
                    ref,
                    name: entity.card.name,
                    travelTimes:
                      entity.card.travelTimes ?? unavailableTravelTimes(),
                  };
                }),
              };
            },
          }),
          requestLocationAccess: tool({
            description:
              "Propone al móvil solicitar permiso o una lectura GPS actual cuando una consulta cercana no tiene ubicación. Nunca solicita permiso desde el servidor.",
            inputSchema: z.object({}).strict(),
            execute: async () => ({
              available: Boolean(approximateLocation),
              clientAction: approximateLocation ? null : "request_location",
            }),
          }),
          searchPublishedEstablishments: tool({
            description:
              "Busca restaurantes/cafeterías (kind food), alojamiento (kind lodging) u otros establecimientos publicados sin requerir GPS. text solo filtra una preferencia específica, no la frase genérica de la pregunta. locality solo si el visitante mencionó una ciudad, cantón o provincia; sin localidad no afirma cercanía.",
            inputSchema: browseEstablishmentsInputSchema,
            execute: async ({ kind, text, locality, limit }) => {
              try {
                const items = await this.establishments.browse({
                  kind: forceEstablishmentKind ?? kind,
                  text: isGenericEstablishmentQuestion(input.message)
                    ? undefined
                    : text,
                  locality: isUserProvidedLocality(locality, input)
                    ? locality
                    : undefined,
                  limit,
                });
                const refs = items.map((item) =>
                  registerEstablishment(
                    item,
                    `${publishedEstablishmentsSource}: ${item.nombreComercial} (${item.localityName})`,
                  ),
                );
                establishmentBrowseRefs = refs;
                await attachTravelTimes(refs);
                return {
                  total: items.length,
                  results: items.map((item, index) => ({
                    ref: refs[index],
                    name: item.nombreComercial,
                    activity: item.actividad,
                    classification: item.clasificacion,
                    category: item.categoria,
                    localityName: item.localityName,
                    address: item.direccion,
                    travelTimes: entities.get(refs[index])?.card.travelTimes,
                  })),
                  source: publishedEstablishmentsSource,
                  locationBased: false,
                };
              } catch {
                establishmentBrowseFailed = true;
                return genericToolFailure;
              }
            },
          }),
          listPublishedCenters: tool({
            description:
              "Enumera centros turísticos publicados sin GPS. Puedes filtrar por nombre de provincia, cantón o parroquia si la persona indicó una localidad; no pidas GPS para esta consulta.",
            inputSchema: listCentersInputSchema,
            execute: async ({ limit, locality }) => {
              try {
                const result = await this.centers.listPublished({
                  limit,
                  ...(locality ? { locality } : {}),
                });
                generalCatalogRefs = result.items.map((center) =>
                  registerCenter(
                    `center:${center.code}`,
                    center,
                    `${publishedCentersSource}: ${center.name}`,
                  ),
                );
                await attachTravelTimes(generalCatalogRefs);
                return {
                  total: result.total,
                  results: result.items.map((center) => ({
                    ref: `center:${center.code}`,
                    name: center.name,
                    description: center.description,
                    category: center.category,
                    type: center.type,
                    travelTimes: entities.get(`center:${center.code}`)?.card
                      .travelTimes,
                  })),
                  source: publishedCentersSource,
                };
              } catch {
                generalCatalogFailed = true;
                return genericToolFailure;
              }
            },
          }),
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
                const refs = result.items.map((center) =>
                  registerCenter(
                    `center:${center.code}`,
                    center,
                    publishedCentersSource,
                  ),
                );
                await attachTravelTimes(refs);
                return {
                  total: result.total,
                  results: result.items.map((center, index) => {
                    const ref = refs[index];
                    return {
                      ref,
                      code: center.code,
                      name: center.name,
                      description: center.description,
                      category: center.category,
                      type: center.type,
                      subtype: center.subtype,
                      hierarchy: center.hierarchy,
                      travelTimes: entities.get(ref)?.card.travelTimes,
                    };
                  }),
                  source: publishedCentersSource,
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
                  message: "Necesito tu ubicación para buscar cerca de ti.",
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

                await attachTravelTimes(results.map((item) => item.ref));

                return {
                  available: true,
                  radiusMeters,
                  category: category ?? null,
                  total: results.length,
                  results: results.map((item) => ({
                    ...item,
                    travelTimes: entities.get(item.ref)?.card.travelTimes,
                  })),
                  source: sourceLabel,
                  ...(results.length === 0
                    ? {
                        message: "No encontré lugares en esa zona.",
                      }
                    : {}),
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
                await attachTravelTimes([ref]);
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
                  travelTimes: entities.get(ref)?.card.travelTimes,
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
                          "No tengo información de rutas u horarios para este lugar.",
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
                    "Necesito tu ubicación para buscar paradas cercanas.",
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
                          "No encontré paradas de transporte en esa zona.",
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
                  message: "No encontré ese destino para calcular la ruta.",
                };
              }

              const originEntity = fromRef ? entities.get(fromRef) : undefined;
              if (fromRef && !originEntity?.destination) {
                return {
                  available: true,
                  found: false,
                  message:
                    "No encontré el lugar de salida para calcular la ruta.",
                };
              }
              if (!fromRef && !approximateLocation) {
                return {
                  available: false,
                  message:
                    "Necesito tu ubicación para calcular una ruta desde donde estás.",
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
                  message: "La salida y el destino están en el mismo punto.",
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
                    message: "No encontré una ruta entre esos lugares.",
                  };
                }
                if (error instanceof RouteProviderUnavailableError) {
                  return {
                    available: false,
                    message:
                      "No pude calcular la ruta ahora. Inténtalo de nuevo.",
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
                  message: "Necesito tu ubicación para buscar cerca de ti.",
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
                const refs = result.items.map((item) =>
                  registerEstablishment(item, sourceLabel),
                );
                await attachTravelTimes(refs);
                return {
                  available: true,
                  fallbackApplied: result.fallbackApplied,
                  requestedLocalityName: result.requestedLocalityName,
                  effectiveLocality: result.effectiveLocality,
                  results: result.items.map((item, index) => ({
                    ref: refs[index],
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
                    travelTimes: entities.get(refs[index])?.card.travelTimes,
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

      if (
        onText &&
        !forceGeneralCatalogTool &&
        !forceEstablishmentKind &&
        !needsCurrentLocation
      ) {
        let lastText = "";
        for await (const partial of result.partialOutputStream) {
          if (typeof partial.text !== "string" || partial.text === lastText)
            continue;
          lastText = partial.text;
          await onText(lastText);
        }
      }

      let modelOutput: Awaited<typeof result.output>;
      try {
        modelOutput = await result.output;
      } catch (error) {
        if (needsCurrentLocation) return missingLocationAnswer();
        const fallback: AgentResponse = {
          text: "No pude responder ahora. Inténtalo de nuevo.",
          cards: [],
          actions: [],
          sources: [],
        };
        if (forceGeneralCatalogTool) {
          return finishAnswer(
            completeGeneralDiscoveryAnswer(
              fallback,
              generalCatalogRefs,
              generalCatalogFailed,
              entities,
            ),
          );
        }
        if (forceEstablishmentKind) {
          return completeEstablishmentDiscoveryAnswer(
            fallback,
            forceEstablishmentKind,
            establishmentBrowseRefs,
            establishmentBrowseFailed,
            entities,
          );
        }
        throw error;
      }
      const answer = sanitizeAgentResponse(modelOutput, entities, [
        ...trustedSources.values(),
      ]);
      if (needsCurrentLocation) return missingLocationAnswer();
      if (forceGeneralCatalogTool) {
        return finishAnswer(
          completeGeneralDiscoveryAnswer(
            answer,
            generalCatalogRefs,
            generalCatalogFailed,
            entities,
          ),
        );
      }
      if (forceEstablishmentKind) {
        return finishAnswer(
          completeEstablishmentDiscoveryAnswer(
            answer,
            forceEstablishmentKind,
            establishmentBrowseRefs,
            establishmentBrowseFailed,
            entities,
          ),
        );
      }
      return finishAnswer(answer);
    } catch (error) {
      if (needsCurrentLocation) return missingLocationAnswer();
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        "No puedo responder ahora. Inténtalo de nuevo.",
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
          "No puedo responder ahora. Inténtalo de nuevo.",
        );
      return createOpenAI({ apiKey })(modelId);
    }
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey)
      throw new ServiceUnavailableException(
        "No puedo responder ahora. Inténtalo de nuevo.",
      );
    return createAnthropic({ apiKey })(modelId);
  }
}

export function hasNearbyIntent(message: string): boolean {
  return /\b(cerca|cercan[oa]s?|alrededor|proxim[oa]s?|aqui cerca|desde aqui|mi ubicacion|near|nearby|around me|from here|my location)\b/.test(
    normalizeIntent(message),
  );
}

export function hasTravelTimeIntent(message: string): boolean {
  const normalized = normalizeIntent(message);
  const namedOrigin =
    /\b(desde|(?:llegar|llego|viajar|viaje|ir|ruta|tiempo|tarda|toma|demora) de) (?!aqui\b|aca\b|mi\b|donde\b).+? (a|al|hasta|hacia) (?!pie\b|bici\b|bicicleta\b|carro\b|auto\b|coche\b)\S/.test(
      normalized,
    ) ||
    /\bentre .+? y \S/.test(normalized) ||
    /\bfrom (?!here\b|my\b).+? to \S/.test(normalized);
  const explicitTravelTime =
    /\b((a|en) cuantos? minutos?|tiempo (de viaje|de llegada|para llegar)|como (llego|llegar)|how many minutes|travel time)\b/.test(
      normalized,
    );
  const timeQuestion =
    /\b(cuanto (tiempo )?(me |se )?(tardo|tarda|tardaria|demoro|demora|toma|tomaria)|how long)\b/.test(
      normalized,
    );
  const journey =
    /\b(llegar|llego|ir|viajar|caminando|conduciendo|get (there|to)|reach|walk|drive|cycle|travel)\b/.test(
      normalized,
    );
  return !namedOrigin && (explicitTravelTime || (timeQuestion && journey));
}

function unavailableTravelTimes(): TravelTimeEstimate[] {
  return (["car", "foot", "bicycle"] as const).map((mode) => ({
    mode,
    status: "unavailable",
  }));
}

function missingLocationAnswer(): AgentResponse {
  return {
    text: "Necesito tu ubicación para buscar cerca de ti o calcular tiempos. Toca «Usar mi ubicación».",
    cards: [],
    actions: [{ type: "request_location" }],
    sources: [],
  };
}

export function hasGeneralDiscoveryIntent(message: string): boolean {
  const normalized = normalizeIntent(message);
  return (
    /\b(lugares? turisticos?|atractivos? turisticos?|sitios? turisticos?|tourist attractions?|places to visit)\b/.test(
      normalized,
    ) && !/\b(near|cerca|plan|itinerario|recorrido)\b/.test(normalized)
  );
}

export function getEstablishmentDiscoveryKind(
  message: string,
): "food" | "lodging" | null {
  const normalized = normalizeIntent(message);
  if (
    /\b(donde (puedo )?comer|restaurantes?|cafeterias?|comida|where (can i )?eat|restaurants?|food)\b/.test(
      normalized,
    )
  ) {
    return "food";
  }
  if (
    /\b(donde (puedo )?(hospedarme|dormir|alojarme)|hospedaje|alojamiento|hoteles?|hostales?|where (can i )?stay|lodging|hotels?)\b/.test(
      normalized,
    )
  ) {
    return "lodging";
  }
  return null;
}

function normalizeIntent(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isGenericEstablishmentQuestion(message: string): boolean {
  const normalized = normalizeIntent(message)
    .replace(/[¿?!.]/g, "")
    .trim();
  return /^(donde (puedo )?(comer|hospedarme|dormir|alojarme)|where (can i )?(eat|stay))$/.test(
    normalized,
  );
}

function isUserProvidedLocality(
  locality: string | undefined,
  input: AgentChatInput,
): locality is string {
  if (!locality) return false;
  const name = normalizeIntent(locality.trim());
  if (name.length < 2) return false;
  return [
    input.message,
    ...input.history
      .filter((item) => item.role === "user")
      .map((item) => item.content),
  ]
    .map(normalizeIntent)
    .some((message) => message.includes(name));
}

function completeGeneralDiscoveryAnswer(
  answer: AgentResponse,
  refs: string[] | null,
  failed: boolean,
  entities: ReadonlyMap<string, TrustedAgentEntity>,
): AgentResponse {
  if (failed || refs === null) {
    return {
      text: "No pude buscar lugares ahora. Inténtalo de nuevo.",
      cards: [],
      actions: [],
      sources: [],
    };
  }
  if (refs.length === 0) {
    return {
      text: "No encontré lugares para esa búsqueda.",
      cards: [],
      actions: [],
      sources: [{ type: "center", label: publishedCentersSource }],
    };
  }
  if (answer.cards.length > 0 && !asksForLocationToDiscover(answer.text)) {
    return answer;
  }
  return {
    text: "Puedes visitar estos lugares.",
    cards: refs
      .slice(0, 6)
      .map((ref) => entities.get(ref)?.card)
      .filter((card): card is NonNullable<typeof card> => Boolean(card)),
    actions: [],
    sources: sourcesForRefs(refs, entities),
  };
}

function completeEstablishmentDiscoveryAnswer(
  answer: AgentResponse,
  kind: "food" | "lodging",
  refs: string[] | null,
  failed: boolean,
  entities: ReadonlyMap<string, TrustedAgentEntity>,
): AgentResponse {
  if (failed || refs === null) {
    return {
      text: "No pude buscar opciones ahora. Inténtalo de nuevo.",
      cards: [],
      actions: [],
      sources: [],
    };
  }
  const label = kind === "food" ? "lugares para comer" : "alojamientos";
  if (refs.length === 0) {
    return {
      text: `No encontré ${label} para esa búsqueda.`,
      cards: [],
      actions: [],
      sources: [
        { type: "establishment", label: publishedEstablishmentsSource },
      ],
    };
  }
  if (answer.cards.length > 0 && !asksForLocationToDiscover(answer.text)) {
    return answer;
  }
  return {
    text:
      kind === "food"
        ? "Puedes comer en estos lugares."
        : "Puedes alojarte en estos lugares.",
    cards: refs
      .slice(0, 6)
      .map((ref) => entities.get(ref)?.card)
      .filter((card): card is NonNullable<typeof card> => Boolean(card)),
    actions: [],
    sources: sourcesForRefs(refs, entities),
  };
}

function sourcesForRefs(
  refs: readonly string[],
  entities: ReadonlyMap<string, TrustedAgentEntity>,
): AgentSource[] {
  const selected = refs
    .slice(0, 6)
    .map((ref) => entities.get(ref))
    .filter((entity): entity is TrustedAgentEntity => Boolean(entity));
  const sources = selected.map((entity) => entity.source);
  if (
    selected.some((entity) =>
      entity.card.travelTimes?.some(
        (estimate) => estimate.status === "available",
      ),
    )
  ) {
    sources.push({
      type: "routing",
      label: "Tiempos estimados de llegada por caminos",
    });
  }
  return [
    ...new Map(
      sources.map((source) => [`${source.type}:${source.label}`, source]),
    ).values(),
  ];
}

function asksForLocationToDiscover(text: string): boolean {
  return /\b(necesito.{0,80}ubicaci[oó]n|activ[ae]s? (la )?ubicaci[oó]n|need.{0,40}location|enable location)\b/i.test(
    text,
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
