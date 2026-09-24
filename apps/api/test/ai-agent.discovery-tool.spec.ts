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

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;
type Options = {
  prepareStep: (input: { stepNumber: number }) => unknown;
  tools: Record<string, { execute?: ToolExecutor }>;
};

function service(
  items: PublicCenter[],
  publishedEstablishments: PublicEstablishmentSearchItem[] = [],
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
    expect(answer.text).toMatch(/no hay lugares turísticos publicados/i);
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
    expect(answer.text).toMatch(/lugares turísticos publicados/i);
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
  });
});
