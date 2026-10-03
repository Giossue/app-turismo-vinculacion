import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, streamText: vi.fn() };
});

import { streamText } from "ai";

import {
  AiAgentService,
  getEstablishmentDiscoveryKind,
  hasGeneralDiscoveryIntent,
} from "../src/ai/application/ai-agent.service";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";
import type { PublicCenter } from "../src/centers/domain/public-center";
import type {
  PublicEstablishmentSearch,
  PublicEstablishmentSearchItem,
} from "../src/ai/application/public-establishment-search";
import type { PublicNearbyEstablishmentSearch } from "../src/ai/application/public-nearby-establishment-search";
import type { PublicPoiRepository } from "../src/pois/application/public-poi.repository";
import type { PublicTransportRepository } from "../src/transport/application/public-transport.repository";
import type { CalculateRouteUseCase } from "../src/routing/application/calculate-route.use-case";

const center: PublicCenter = {
  code: "GUA-001",
  name: "Centro Cultural Indio Guaranga",
  description: "Centro publicado en Guaranda",
  latitude: -1.594,
  longitude: -79,
  category: "Manifestaciones culturales",
  type: "Centro cultural",
  subtype: "Sitio cultural",
  hierarchy: null,
  categoryCode: "CAT-001",
  typeCode: "TYPE-001",
  subtypeCode: "SUBTYPE-001",
  provinceCode: "02",
  cantonCode: "0201",
  parishCode: "020150",
  hierarchyCode: null,
};

const internalMethodLanguage =
  /catálogo|catastro|ficha|publicad|verific|proveedor/i;

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;
type Options = {
  system: string;
  prepareStep: (input: { stepNumber: number }) => unknown;
  tools: Record<string, { execute?: ToolExecutor }>;
};

function service(
  items: PublicCenter[],
  publishedEstablishments: PublicEstablishmentSearchItem[] = [],
  centerLocations: Partial<
    Pick<PublicCenterRepository, "findPublishedByCode" | "getDiscoveryCatalog">
  > = {},
) {
  const listPublished = vi
    .fn()
    .mockResolvedValue({ items, total: items.length });
  const browse = vi.fn().mockResolvedValue(publishedEstablishments);
  const centers = {
    listPublished,
    findPublishedByCode: async () => null,
    listNearbyPublished: async () => ({ items: [] }),
    getDiscoveryCatalog: async () => ({
      categories: [],
      types: [],
      subtypes: [],
      provinces: [],
      cantons: [],
      parishes: [],
      hierarchies: [],
    }),
    ...centerLocations,
  } as PublicCenterRepository;
  const establishments: PublicEstablishmentSearch = {
    browse,
    nearby: async () => ({
      items: [],
      fallbackApplied: false,
      requestedLocalityName: null,
      effectiveLocality: null,
    }),
  };
  const nearby: PublicNearbyEstablishmentSearch = {
    nearby: async () => [],
  };
  const pois: PublicPoiRepository = {
    listNearby: async () => ({ items: [] }),
  };
  const transport: PublicTransportRepository = {
    findForPublishedCenter: async () => null,
    listNearbyStops: async () => [],
  };
  const routing = {
    execute: vi.fn(),
  } as unknown as CalculateRouteUseCase;
  return {
    agent: new AiAgentService(
      new ConfigService({
        AI_PROVIDER: "anthropic",
        AI_MODEL: "claude-sonnet-test",
        ANTHROPIC_API_KEY: "test-key",
      }),
      centers,
      establishments,
      nearby,
      pois,
      transport,
      routing,
    ),
    listPublished,
    browse,
  };
}

describe("general tourism discovery", () => {
  it.each([false, true])(
    "keeps destination cards compatible with location capability %s",
    async (includeCenterLocations) => {
      const findPublishedByCode = vi.fn().mockResolvedValue({
        ...center,
        address: "Calle Sucre",
        touristZone: "Zona central",
        altitudeMeters: null,
        admission: null,
        activities: [],
        accessibility: [],
        facilities: [],
        photos: [],
      });
      const getDiscoveryCatalog = vi.fn().mockResolvedValue({
        categories: [],
        types: [],
        subtypes: [],
        provinces: [],
        cantons: [{ code: "0201", name: "Guaranda", provinceCode: "02" }],
        parishes: [],
        hierarchies: [],
      });
      const { agent, listPublished } = service([center], [], {
        findPublishedByCode,
        getDiscoveryCatalog,
      });
      vi.mocked(streamText).mockImplementation((input) => {
        const options = input as unknown as Options;
        expect(options.tools).not.toHaveProperty("findItineraryCandidates");
        expect(options.system).toContain(
          "no generes un itinerario ni prometas guardarlo",
        );
        return {
          output: (async () => {
            await options.tools.listPublishedCenters.execute?.({ limit: 6 });
            return {
              text: "Puedes visitar este lugar publicado.",
              cards: [{ ref: `center:${center.code}` }],
              actions: [],
            };
          })(),
          partialOutputStream: (async function* () {})(),
        } as never;
      });
      const answer = await agent.generate(
        { message: "¿Qué lugares turísticos puedo visitar?", history: [] },
        undefined,
        undefined,
        includeCenterLocations ? { includeCenterLocations: true } : undefined,
      );
      expect(listPublished).toHaveBeenCalledWith({ limit: 6 });
      expect(answer.cards).toEqual([
        {
          type: "center",
          code: center.code,
          name: center.name,
          summary: center.description,
          category: center.category,
          latitude: center.latitude,
          longitude: center.longitude,
          distanceMeters: null,
          ...(includeCenterLocations
            ? { address: "Calle Sucre", localityName: "Guaranda" }
            : {}),
        },
      ]);
      expect(findPublishedByCode).toHaveBeenCalledTimes(
        includeCenterLocations ? 1 : 0,
      );
      expect(getDiscoveryCatalog).toHaveBeenCalledTimes(
        includeCenterLocations ? 1 : 0,
      );
      expect(answer).not.toHaveProperty("itinerary");
    },
  );

  it("recognizes broad discovery without making GPS mandatory", () => {
    expect(
      hasGeneralDiscoveryIntent("¿Qué lugares turísticos puedo visitar?"),
    ).toBe(true);
    expect(hasGeneralDiscoveryIntent("Tourist attractions")).toBe(true);
    expect(
      hasGeneralDiscoveryIntent("¿Qué lugares turísticos hay cerca de mí?"),
    ).toBe(false);
    expect(
      hasGeneralDiscoveryIntent("¿Qué lugares turísticos hay en Guaranda?"),
    ).toBe(true);
  });

  it("filters general discovery by a named locality without requesting GPS", async () => {
    const { agent, listPublished } = service([center]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      expect(options.prepareStep({ stepNumber: 0 })).toEqual({
        toolChoice: { type: "tool", toolName: "listPublishedCenters" },
      });
      return {
        output: (async () => {
          await options.tools.listPublishedCenters.execute?.({
            limit: 6,
            locality: "Guaranda",
          });
          return { text: "Lugares de Guaranda", cards: [], actions: [] };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });
    const answer = await agent.generate({
      message: "¿Qué lugares turísticos hay en Guaranda?",
      history: [],
    });
    expect(listPublished).toHaveBeenCalledWith({
      limit: 6,
      locality: "Guaranda",
    });
    expect(answer.cards).toMatchObject([{ code: center.code }]);
  });

  it("calls the public catalog without coordinates and repairs an ungrounded model answer", async () => {
    const { agent, listPublished } = service([center]);
    const streamedText = vi.fn();
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      expect(options.prepareStep({ stepNumber: 0 })).toEqual({
        toolChoice: { type: "tool", toolName: "listPublishedCenters" },
      });
      const output = (async () => {
        const toolResult = await options.tools.listPublishedCenters.execute?.({
          limit: 6,
        });
        expect(toolResult).toMatchObject({ total: 1 });
        return {
          text: "Necesito saber tu ubicación para recomendar lugares.",
          cards: [],
          actions: [],
        };
      })();
      return {
        output,
        partialOutputStream: (async function* () {
          yield { text: "Necesito saber tu ubicación" };
        })(),
      } as never;
    });

    const answer = await agent.generate(
      { message: "¿Qué lugares turísticos puedo visitar?", history: [] },
      streamedText,
    );

    expect(listPublished).toHaveBeenCalledWith({ limit: 6 });
    expect(answer.text).not.toMatch(/necesito.*ubicaci[oó]n/i);
    expect(answer.cards).toMatchObject([{ code: center.code }]);
    expect(answer.sources).toContainEqual({
      type: "center",
      label: `Catálogo de centros turísticos publicados: ${center.name}`,
    });
    expect(streamedText).not.toHaveBeenCalled();
  });

  it("reports a genuinely empty public catalog", async () => {
    const { agent } = service([]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      return {
        output: (async () => {
          await options.tools.listPublishedCenters.execute?.({ limit: 6 });
          return { text: "Hay muchos lugares", cards: [], actions: [] };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: "¿Qué lugares turísticos puedo visitar?",
      history: [],
    });
    expect(answer.cards).toEqual([]);
    expect(answer.text).toBe("No encontré lugares para esa búsqueda.");
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([
      { type: "center", label: "Catálogo de centros turísticos publicados" },
    ]);
  });

  it("distinguishes a failed search from no matches without inventing places", async () => {
    const { agent, listPublished } = service([center]);
    listPublished.mockRejectedValueOnce(new Error("Search unavailable"));
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      return {
        output: (async () => {
          const failure = await options.tools.listPublishedCenters.execute?.({
            limit: 6,
          });
          expect(failure).toMatchObject({ available: false });
          expect((failure as { message: string }).message).not.toMatch(
            internalMethodLanguage,
          );
          return {
            text: "Puedes visitar un mirador.",
            cards: [{ ref: `center:${center.code}` }],
            actions: [],
          };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: "¿Qué lugares turísticos puedo visitar?",
      history: [],
    });
    expect(answer.text).toMatch(/^No pude buscar lugares/);
    expect(answer.text).not.toMatch(internalMethodLanguage);
    expect(answer.cards).toEqual([]);
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([]);
  });

  it("keeps verified catalog results when structured model output fails", async () => {
    const { agent } = service([center]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      return {
        output: (async () => {
          await options.tools.listPublishedCenters.execute?.({ limit: 6 });
          throw new Error("provider output failed");
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: "¿Qué lugares turísticos puedo visitar?",
      history: [],
    });
    expect(answer.cards).toMatchObject([{ code: center.code }]);
    expect(answer.text).toBe("Puedes visitar estos lugares.");
  });
});

describe("nearby discovery location handoff", () => {
  it("asks the mobile client for location only when a nearby question has no coordinate", async () => {
    const { agent } = service([center]);
    const streamedText = vi.fn();
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      expect(options.prepareStep({ stepNumber: 0 })).toEqual({
        toolChoice: { type: "tool", toolName: "requestLocationAccess" },
      });
      return {
        output: (async () => {
          expect(
            await options.tools.requestLocationAccess.execute?.({}),
          ).toEqual({
            available: false,
            clientAction: "request_location",
          });
          return { text: "Ubicación desconocida", cards: [], actions: [] };
        })(),
        partialOutputStream: (async function* () {
          yield { text: "Ubicación desconocida" };
        })(),
      } as never;
    });

    const answer = await agent.generate(
      { message: "¿Qué hay cerca de mí?", history: [] },
      streamedText,
    );

    expect(answer.actions).toEqual([{ type: "request_location" }]);
    expect(answer.text).toContain("Necesito tu ubicación");
    expect(streamedText).not.toHaveBeenCalled();
  });

  it("uses nearby catalog when the current position is supplied", async () => {
    const { agent } = service([]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      expect(options.prepareStep({ stepNumber: 0 })).toEqual({
        toolChoice: { type: "tool", toolName: "searchNearbyPublishedPlaces" },
      });
      return {
        output: Promise.resolve({
          text: "Sin resultados",
          cards: [],
          actions: [],
        }),
        partialOutputStream: (async function* () {})(),
      } as never;
    });
    const answer = await agent.generate({
      message: "¿Qué hay cerca de mí?",
      history: [],
      location: { latitude: -1.59, longitude: -79 },
    });
    expect(answer.actions).toEqual([]);
  });
});

describe("establishment discovery without GPS", () => {
  it("classifies food and lodging questions", () => {
    expect(getEstablishmentDiscoveryKind("¿Dónde puedo comer?")).toBe("food");
    expect(getEstablishmentDiscoveryKind("¿Dónde puedo hospedarme?")).toBe(
      "lodging",
    );
    expect(getEstablishmentDiscoveryKind("¿Dónde hay un museo?")).toBeNull();
  });

  it("returns verified food establishments instead of demanding location", async () => {
    const establishment: PublicEstablishmentSearchItem = {
      nombreComercial: "Comedor de prueba",
      actividad: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
      clasificacion: "RESTAURANTE",
      categoria: null,
      direccion: "Calle principal",
      telefono: null,
      latitude: -1.59,
      longitude: -79.01,
      distanceMeters: null,
      localityName: "Guaranda",
    };
    const { agent, browse } = service([], [establishment]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      expect(options.prepareStep({ stepNumber: 0 })).toEqual({
        toolChoice: {
          type: "tool",
          toolName: "searchPublishedEstablishments",
        },
      });
      return {
        output: (async () => {
          await options.tools.searchPublishedEstablishments.execute?.({
            kind: "lodging",
            text: "comer",
            locality: "Quito",
            limit: 6,
          });
          return {
            text: "Necesito que actives la ubicación para recomendarte restaurantes.",
            cards: [],
            actions: [],
          };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: "¿Dónde puedo comer?",
      history: [],
    });

    expect(browse).toHaveBeenCalledWith({
      kind: "food",
      text: undefined,
      locality: undefined,
      limit: 6,
    });
    expect(answer.text).not.toMatch(/necesito.*ubicaci[oó]n/i);
    expect(answer.cards).toMatchObject([
      { type: "establishment", name: "Comedor de prueba" },
    ]);
    expect(answer.sources).toContainEqual({
      type: "establishment",
      label: "Catastro turístico público: Comedor de prueba (Guaranda)",
    });
    expect(answer.text).toBe("Puedes comer en estos lugares.");
  });

  it.each([
    {
      kind: "food",
      message: "¿Dónde puedo comer?",
      label: "lugares para comer",
    },
    {
      kind: "lodging",
      message: "¿Dónde puedo hospedarme?",
      label: "alojamientos",
    },
  ])("reports no matches for $kind without asking for GPS", async (query) => {
    const { agent } = service([]);
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      return {
        output: (async () => {
          await options.tools.searchPublishedEstablishments.execute?.({
            kind: query.kind,
            limit: 6,
          });
          return {
            text: "Puedes probar esta opción.",
            cards: [{ ref: "establishment:inventado" }],
            actions: [],
          };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: query.message,
      history: [],
    });
    expect(answer.text).toContain(`No encontré ${query.label}`);
    expect(answer.text).not.toMatch(internalMethodLanguage);
    expect(answer.cards).toEqual([]);
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([
      { type: "establishment", label: "Catastro turístico público" },
    ]);
  });

  it("reports unavailable establishment search without inventing options", async () => {
    const { agent, browse } = service([]);
    browse.mockRejectedValueOnce(new Error("Search unavailable"));
    vi.mocked(streamText).mockImplementation((input) => {
      const options = input as unknown as Options;
      return {
        output: (async () => {
          const failure =
            await options.tools.searchPublishedEstablishments.execute?.({
              kind: "food",
              limit: 6,
            });
          expect(failure).toMatchObject({ available: false });
          return { text: "Opciones disponibles", cards: [], actions: [] };
        })(),
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const answer = await agent.generate({
      message: "¿Dónde puedo comer?",
      history: [],
    });
    expect(answer.text).toMatch(/^No pude buscar opciones/);
    expect(answer.text).not.toMatch(internalMethodLanguage);
    expect(answer.cards).toEqual([]);
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([]);
  });
});
