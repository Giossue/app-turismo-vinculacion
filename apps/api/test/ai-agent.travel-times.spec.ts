import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, streamText: vi.fn() };
});

import { streamText } from "ai";

import {
  AiAgentService,
  getTravelTimesInputSchema,
} from "../src/ai/application/ai-agent.service";
import { agentModelCardSchema } from "../src/ai/application/ai-agent.contracts";
import type {
  PublicEstablishmentSearch,
  PublicEstablishmentSearchItem,
} from "../src/ai/application/public-establishment-search";
import type { PublicNearbyEstablishmentSearch } from "../src/ai/application/public-nearby-establishment-search";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";
import type {
  NearbyPublicCenter,
  PublicCenter,
} from "../src/centers/domain/public-center";
import type { PublicPoiRepository } from "../src/pois/application/public-poi.repository";
import type { PublicPoi } from "../src/pois/domain/public-poi";
import type { CalculateRouteUseCase } from "../src/routing/application/calculate-route.use-case";
import type {
  TravelTimeEstimate,
  TravelTimesRequest,
} from "../src/routing/domain/route";
import type { PublicTransportRepository } from "../src/transport/application/public-transport.repository";

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;
type ModelOptions = {
  abortSignal?: AbortSignal;
  prepareStep: (input: { stepNumber: number }) => unknown;
  tools: Record<string, { execute?: ToolExecutor }>;
};
type SearchResult = {
  results: {
    ref: string;
    name: string;
    type?: string;
    distanceMeters?: number;
    travelTimes?: readonly TravelTimeEstimate[];
  }[];
};
type TravelTimesResult = {
  available: boolean;
  approximateOrigin?: boolean;
  liveTraffic?: boolean;
  found?: boolean;
  clientAction?: string;
  results?: {
    ref: string;
    name: string;
    travelTimes: readonly TravelTimeEstimate[];
  }[];
};

const currentLocation = {
  latitude: -1.59263,
  longitude: -79.00098,
  accuracyMeters: 45,
};

function center(index = 1): PublicCenter {
  return {
    code: `GUA-${index}`,
    name: `Centro publicado ${index}`,
    description: "Centro turístico publicado en Guaranda",
    latitude: -1.594 - index / 1000,
    longitude: -79 - index / 1000,
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
}

const poi: PublicPoi = {
  name: "Mirador publicado",
  description: "Mirador activo",
  zoneName: "Guaranda",
  localityName: "Guaranda",
  latitude: -1.59,
  longitude: -79.01,
  distanceMeters: 200,
};

const establishment: PublicEstablishmentSearchItem = {
  nombreComercial: "Restaurante publicado",
  actividad: "ALIMENTOS Y BEBIDAS",
  clasificacion: "RESTAURANTE",
  categoria: null,
  direccion: "Calle principal",
  telefono: null,
  latitude: -1.596,
  longitude: -79.005,
  distanceMeters: 500,
  localityName: "Guaranda",
};

function estimates(destinationIndex = 0): readonly TravelTimeEstimate[] {
  return [
    {
      mode: "car",
      status: "available",
      durationSeconds: 120 + destinationIndex * 60,
      distanceMeters: 1400 + destinationIndex * 100,
    },
    {
      mode: "foot",
      status: "available",
      durationSeconds: 600 + destinationIndex * 60,
      distanceMeters: 1100 + destinationIndex * 100,
    },
    {
      mode: "bicycle",
      status: "available",
      durationSeconds: 300 + destinationIndex * 60,
      distanceMeters: 1250 + destinationIndex * 100,
    },
  ];
}

const unavailableEstimates = ["car", "foot", "bicycle"].map((mode) => ({
  mode,
  status: "unavailable",
}));

function fixture(
  options: {
    nearbyCenters?: readonly NearbyPublicCenter[];
    nearbyPois?: readonly PublicPoi[];
    nearbyEstablishments?: readonly PublicEstablishmentSearchItem[];
    publishedCenters?: readonly PublicCenter[];
    configured?: boolean;
  } = {},
) {
  const listPublished = vi.fn().mockResolvedValue({
    items: options.publishedCenters ?? [center()],
    total: options.publishedCenters?.length ?? 1,
  });
  const listNearbyPublished = vi.fn().mockResolvedValue({
    items: options.nearbyCenters ?? [],
  });
  const centers: PublicCenterRepository = {
    listPublished,
    listNearbyPublished,
    findPublishedByCode: async () => null,
    getDiscoveryCatalog: async () => ({
      categories: [],
      types: [],
      subtypes: [],
      provinces: [],
      cantons: [],
      parishes: [],
      hierarchies: [],
    }),
  };
  const establishments: PublicEstablishmentSearch = {
    browse: async () => [],
    nearby: async () => ({
      items: [],
      fallbackApplied: false,
      requestedLocalityName: null,
      effectiveLocality: null,
    }),
  };
  const nearbyEstablishments = vi
    .fn()
    .mockResolvedValue(options.nearbyEstablishments ?? []);
  const nearby: PublicNearbyEstablishmentSearch = {
    nearby: nearbyEstablishments,
  };
  const listNearbyPois = vi.fn().mockResolvedValue({
    items: options.nearbyPois ?? [],
  });
  const pois: PublicPoiRepository = { listNearby: listNearbyPois };
  const transport: PublicTransportRepository = {
    findForPublishedCenter: async () => null,
    listNearbyStops: async () => [],
  };
  const estimateTravelTimes = vi
    .fn()
    .mockImplementation(async (request: TravelTimesRequest) =>
      request.destinations.map((_, index) => estimates(index)),
    );
  const routing = {
    execute: vi.fn(),
    estimateTravelTimes,
  } as unknown as CalculateRouteUseCase;
  const agent = new AiAgentService(
    new ConfigService({
      AI_PROVIDER: "anthropic",
      AI_MODEL: "claude-sonnet-test",
      ...(options.configured === false
        ? {}
        : { ANTHROPIC_API_KEY: "test-key" }),
    }),
    centers,
    establishments,
    nearby,
    pois,
    transport,
    routing,
  );
  return {
    agent,
    listPublished,
    listNearbyPublished,
    listNearbyPois,
    nearbyEstablishments,
    estimateTravelTimes,
  };
}

async function execute<T>(
  options: ModelOptions,
  toolName: string,
  input: Record<string, unknown>,
): Promise<T> {
  const executor = options.tools[toolName]?.execute;
  if (!executor) throw new Error(`Expected tool ${toolName}`);
  return (await executor(input)) as T;
}

function modelUsing(
  output: (options: ModelOptions) => Promise<{
    text: string;
    cards: { ref: string; travelTimes?: unknown }[];
    actions: never[];
  }>,
) {
  vi.mocked(streamText).mockImplementation(
    (options) =>
      ({
        output: output(options as unknown as ModelOptions),
        partialOutputStream: (async function* () {})(),
      }) as never,
  );
}

beforeEach(() => {
  vi.mocked(streamText).mockReset();
});

describe("AiAgentService travel times", () => {
  it("enriches mixed nearby results once while keeping direct-distance order and trusted metrics", async () => {
    const item = { ...center(), distanceMeters: 900 };
    const {
      agent,
      estimateTravelTimes,
      listNearbyPublished,
      listNearbyPois,
      nearbyEstablishments,
    } = fixture({
      nearbyCenters: [item],
      nearbyPois: [poi],
      nearbyEstablishments: [establishment],
    });
    const abort = new AbortController();
    let searchResult: SearchResult | undefined;
    let travelTimesResult: TravelTimesResult | undefined;
    modelUsing(async (options) => {
      expect(options.abortSignal).toBe(abort.signal);
      searchResult = await execute<SearchResult>(
        options,
        "searchNearbyPublishedPlaces",
        {
          radiusMeters: 5000,
          limit: 6,
        },
      );
      const refs = searchResult.results.map(({ ref }) => ref);
      travelTimesResult = await execute<TravelTimesResult>(
        options,
        "getTravelTimes",
        { refs },
      );
      await execute(options, "getTravelTimes", {
        refs: [refs[0], refs[0], refs[2]],
      });
      return {
        text: "Tiempos estimados para los lugares encontrados.",
        cards: refs.map((ref) => ({
          ref,
          travelTimes: [
            {
              mode: "car",
              status: "available",
              durationSeconds: 1,
              distanceMeters: 1,
            },
          ],
        })),
        actions: [],
      };
    });

    const answer = await agent.generate(
      {
        message: "¿Qué lugares hay cerca de mí y a cuántos minutos están?",
        history: [],
        location: currentLocation,
      },
      undefined,
      abort.signal,
    );

    expect(
      searchResult?.results.map(({ type, distanceMeters }) => [
        type,
        distanceMeters,
      ]),
    ).toEqual([
      ["poi", 200],
      ["establishment", 500],
      ["center", 900],
    ]);
    expect(answer.cards.map(({ name }) => name)).toEqual([
      poi.name,
      establishment.nombreComercial,
      item.name,
    ]);
    expect(estimateTravelTimes).toHaveBeenCalledTimes(1);
    expect(estimateTravelTimes).toHaveBeenCalledWith(
      {
        origin: { latitude: -1.593, longitude: -79.001 },
        destinations: [
          { latitude: poi.latitude, longitude: poi.longitude },
          {
            latitude: establishment.latitude,
            longitude: establishment.longitude,
          },
          { latitude: item.latitude, longitude: item.longitude },
        ],
      },
      abort.signal,
    );
    const nearbyQuery = {
      latitude: -1.593,
      longitude: -79.001,
      radiusMeters: 5000,
      category: undefined,
      limit: 6,
    };
    expect(listNearbyPublished).toHaveBeenCalledWith(nearbyQuery);
    expect(listNearbyPois).toHaveBeenCalledWith(nearbyQuery);
    expect(nearbyEstablishments).toHaveBeenCalledWith(nearbyQuery);
    expect(travelTimesResult).toMatchObject({
      available: true,
      approximateOrigin: true,
      liveTraffic: false,
    });
    answer.cards.forEach((card, index) => {
      expect(card.travelTimes).toEqual(estimates(index));
      expect(searchResult?.results[index].travelTimes).toEqual(
        card.travelTimes,
      );
      expect(travelTimesResult?.results?.[index].travelTimes).toEqual(
        card.travelTimes,
      );
    });
    expect(answer.sources).toContainEqual({
      type: "routing",
      label: "Tiempos estimados de llegada por caminos",
    });
  });

  it("accepts only references in the tool and card contracts", () => {
    expect(
      getTravelTimesInputSchema.safeParse({ refs: ["center:GUA-1"] }).success,
    ).toBe(true);
    expect(
      getTravelTimesInputSchema.safeParse({
        refs: ["center:GUA-1"],
        latitude: -1.593,
        longitude: -79.001,
      }).success,
    ).toBe(false);
    expect(
      getTravelTimesInputSchema.safeParse({
        refs: ["center:GUA-1"],
        minutes: 5,
      }).success,
    ).toBe(false);
    expect(
      agentModelCardSchema.safeParse({
        ref: "center:GUA-1",
        travelTimes: estimates(),
      }).success,
    ).toBe(false);
  });

  it("never calls routing for unknown references", async () => {
    const { agent, estimateTravelTimes } = fixture();
    let toolResult: TravelTimesResult | undefined;
    modelUsing(async (options) => {
      toolResult = await execute(options, "getTravelTimes", {
        refs: ["center:invented"],
      });
      return { text: "No hay destino verificado.", cards: [], actions: [] };
    });

    const answer = await agent.generate({
      message: "Verifica este lugar",
      history: [],
      location: currentLocation,
    });

    expect(toolResult).toMatchObject({ available: true, found: false });
    expect(estimateTravelTimes).not.toHaveBeenCalled();
    expect(answer.cards).toEqual([]);
  });

  it("reuses cached estimates when a known center is registered again", async () => {
    const { agent, estimateTravelTimes } = fixture();
    modelUsing(async (options) => {
      const first = await execute<SearchResult>(
        options,
        "searchPublishedCenters",
        {
          text: "Centro",
          limit: 1,
        },
      );
      const second = await execute<SearchResult>(
        options,
        "searchPublishedCenters",
        {
          text: "Centro",
          limit: 1,
        },
      );
      expect(second.results[0].travelTimes).toEqual(
        first.results[0].travelTimes,
      );
      await execute(options, "getTravelTimes", {
        refs: [first.results[0].ref],
      });
      return {
        text: "Destino verificado",
        cards: [{ ref: first.results[0].ref }],
        actions: [],
      };
    });

    const answer = await agent.generate({
      message: "Verifica el centro",
      history: [],
      location: currentLocation,
    });

    expect(estimateTravelTimes).toHaveBeenCalledTimes(1);
    expect(answer.cards[0].travelTimes).toEqual(estimates());
  });

  it("deduplicates coordinates across center, POI and establishment references", async () => {
    const item = { ...center(), distanceMeters: 200 };
    const samePoi = {
      ...poi,
      latitude: item.latitude,
      longitude: item.longitude,
    };
    const sameEstablishment = {
      ...establishment,
      latitude: item.latitude,
      longitude: item.longitude,
    };
    const { agent, estimateTravelTimes } = fixture({
      nearbyCenters: [item],
      nearbyPois: [samePoi],
      nearbyEstablishments: [sameEstablishment],
    });
    modelUsing(async (options) => {
      const result = await execute<SearchResult>(
        options,
        "searchNearbyPublishedPlaces",
        {
          radiusMeters: 5000,
          limit: 6,
        },
      );
      await execute(options, "getTravelTimes", {
        refs: result.results.map(({ ref }) => ref),
      });
      return {
        text: "Lugares publicados",
        cards: result.results.map(({ ref }) => ({ ref })),
        actions: [],
      };
    });

    const answer = await agent.generate({
      message: "¿Qué hay cerca?",
      history: [],
      location: currentLocation,
    });

    expect(estimateTravelTimes).toHaveBeenCalledTimes(1);
    expect(estimateTravelTimes.mock.calls[0][0].destinations).toHaveLength(1);
    expect(answer.cards).toHaveLength(3);
    answer.cards.forEach((card) =>
      expect(card.travelTimes).toEqual(estimates()),
    );
  });

  it("bounds concurrent searches to six unique destinations over the entire response", async () => {
    const { agent, listPublished, estimateTravelTimes } = fixture();
    const first = [center(1), center(2), center(3), center(4)];
    const second = [center(1), center(5), center(6), center(7), center(8)];
    listPublished
      .mockResolvedValueOnce({ items: first, total: first.length })
      .mockResolvedValueOnce({ items: second, total: second.length });
    let overflowTimes: TravelTimesResult | undefined;
    modelUsing(async (options) => {
      const [firstResults, secondResults] = await Promise.all([
        execute<SearchResult>(options, "searchPublishedCenters", {
          text: "Primera",
          limit: 4,
        }),
        execute<SearchResult>(options, "searchPublishedCenters", {
          text: "Segunda",
          limit: 5,
        }),
      ]);
      overflowTimes = await execute(options, "getTravelTimes", {
        refs: secondResults.results.slice(-2).map(({ ref }) => ref),
      });
      await execute(options, "getTravelTimes", {
        refs: [firstResults.results[0].ref],
      });
      return {
        text: "Resultados verificados",
        cards: secondResults.results.map(({ ref }) => ({ ref })),
        actions: [],
      };
    });

    const answer = await agent.generate({
      message: "Muéstrame esos lugares",
      history: [],
      location: currentLocation,
    });

    const queriedDestinations = estimateTravelTimes.mock.calls.flatMap(
      ([request]) => request.destinations,
    );
    expect(queriedDestinations).toHaveLength(6);
    expect(
      new Set(
        queriedDestinations.map(
          ({ latitude, longitude }) => `${latitude},${longitude}`,
        ),
      ).size,
    ).toBe(6);
    expect(estimateTravelTimes).toHaveBeenCalledTimes(2);
    expect(
      overflowTimes?.results?.map(({ travelTimes }) => travelTimes),
    ).toEqual([unavailableEstimates, unavailableEstimates]);
    expect(
      answer.cards.slice(-2).map(({ travelTimes }) => travelTimes),
    ).toEqual([unavailableEstimates, unavailableEstimates]);
    expect(answer.cards[0].travelTimes).toEqual(estimates());
  });

  it.each([true, false])(
    "asks for current location for minute questions with configured AI=%s",
    async (configured) => {
      const { agent, estimateTravelTimes } = fixture({ configured });
      const onText = vi.fn();
      modelUsing(async (options) => {
        expect(options.prepareStep({ stepNumber: 0 })).toEqual({
          toolChoice: { type: "tool", toolName: "requestLocationAccess" },
        });
        expect(
          await execute(options, "getTravelTimes", {
            refs: ["center:GUA-1"],
          }),
        ).toMatchObject({ available: false, clientAction: "request_location" });
        return { text: "Llega en cinco minutos", cards: [], actions: [] };
      });

      const answer = await agent.generate(
        {
          message: "¿A cuántos minutos está el centro cultural?",
          history: [],
        },
        onText,
      );

      expect(answer.actions).toEqual([{ type: "request_location" }]);
      expect(answer.text).toMatch(/ubicación actual/i);
      expect(answer.cards).toEqual([]);
      expect(estimateTravelTimes).not.toHaveBeenCalled();
      expect(onText).not.toHaveBeenCalled();
      expect(streamText).toHaveBeenCalledTimes(configured ? 1 : 0);
    },
  );

  it.each([
    { reason: "provider exception", rows: undefined },
    { reason: "missing matrix row", rows: [] },
    {
      reason: "negative duration",
      rows: [
        [{ ...estimates()[0], durationSeconds: -1 }, ...estimates().slice(1)],
      ],
    },
    {
      reason: "nonfinite distance",
      rows: [
        [
          { ...estimates()[0], distanceMeters: Infinity },
          ...estimates().slice(1),
        ],
      ],
    },
    {
      reason: "duplicate modes",
      rows: [[estimates()[0], estimates()[0], estimates()[2]]],
    },
  ])(
    "preserves published cards with unavailable times after $reason",
    async ({ rows }) => {
      const { agent, estimateTravelTimes } = fixture();
      if (rows === undefined)
        estimateTravelTimes.mockRejectedValue(
          new Error("private routing failure"),
        );
      else estimateTravelTimes.mockResolvedValue(rows);
      let timesResult: TravelTimesResult | undefined;
      modelUsing(async (options) => {
        const result = await execute<SearchResult>(
          options,
          "searchPublishedCenters",
          { text: "Centro", limit: 1 },
        );
        timesResult = await execute(options, "getTravelTimes", {
          refs: [result.results[0].ref],
        });
        return {
          text: "Lugar publicado",
          cards: [{ ref: result.results[0].ref }],
          actions: [],
        };
      });

      const answer = await agent.generate({
        message: "Muéstrame el centro",
        history: [],
        location: currentLocation,
      });

      expect(estimateTravelTimes).toHaveBeenCalledTimes(1);
      expect(answer.cards).toMatchObject([
        { name: center().name, travelTimes: unavailableEstimates },
      ]);
      expect(timesResult?.results?.[0].travelTimes).toEqual(
        unavailableEstimates,
      );
      expect(answer.sources.some(({ type }) => type === "routing")).toBe(false);
    },
  );

  it("preserves verified modes when another mode has no route or is unavailable", async () => {
    const { agent, estimateTravelTimes } = fixture();
    const mixed = [
      estimates()[0],
      { mode: "foot", status: "no_route" },
      { mode: "bicycle", status: "unavailable" },
    ];
    estimateTravelTimes.mockResolvedValue([mixed]);
    modelUsing(async (options) => {
      const result = await execute<SearchResult>(
        options,
        "searchPublishedCenters",
        { text: "Centro", limit: 1 },
      );
      return {
        text: "Lugar publicado",
        cards: [{ ref: result.results[0].ref }],
        actions: [],
      };
    });

    const answer = await agent.generate({
      message: "Muéstrame el centro",
      history: [],
      location: currentLocation,
    });

    expect(answer.cards[0].travelTimes).toEqual(mixed);
    expect(answer.sources).toContainEqual({
      type: "routing",
      label: "Tiempos estimados de llegada por caminos",
    });
  });

  it.each(["missing cards", "failed model output"])(
    "keeps routing attribution when general discovery repairs $value",
    async (failure) => {
      const { agent, estimateTravelTimes } = fixture();
      modelUsing(async (options) => {
        await execute<SearchResult>(options, "listPublishedCenters", {
          limit: 6,
        });
        if (failure === "failed model output") {
          throw new Error("model output failed");
        }
        return { text: "Lugares publicados", cards: [], actions: [] };
      });

      const answer = await agent.generate({
        message: "¿Qué lugares turísticos puedo visitar?",
        history: [],
        location: currentLocation,
      });

      expect(estimateTravelTimes).toHaveBeenCalledTimes(1);
      expect(answer.cards).toMatchObject([
        { name: center().name, travelTimes: estimates() },
      ]);
      expect(answer.sources).toContainEqual({
        type: "routing",
        label: "Tiempos estimados de llegada por caminos",
      });
      expect(answer.sources).toContainEqual({
        type: "center",
        label: `Catálogo de centros turísticos publicados: ${center().name}`,
      });
    },
  );

  it("keeps three unavailable modes on a located search card without destination coordinates", async () => {
    const { agent, estimateTravelTimes } = fixture({
      nearbyEstablishments: [
        { ...establishment, latitude: null, longitude: null },
      ],
    });
    let searchResult: SearchResult | undefined;
    let timesResult: TravelTimesResult | undefined;
    modelUsing(async (options) => {
      searchResult = await execute<SearchResult>(
        options,
        "searchNearbyPublishedPlaces",
        { radiusMeters: 5000, limit: 6 },
      );
      const ref = searchResult.results[0].ref;
      timesResult = await execute(options, "getTravelTimes", { refs: [ref] });
      return { text: "Lugar publicado", cards: [{ ref }], actions: [] };
    });

    const answer = await agent.generate({
      message: "¿Qué lugares hay cerca?",
      history: [],
      location: currentLocation,
    });

    expect(estimateTravelTimes).not.toHaveBeenCalled();
    expect(answer.cards).toMatchObject([
      {
        type: "establishment",
        name: establishment.nombreComercial,
        latitude: null,
        longitude: null,
        travelTimes: unavailableEstimates,
      },
    ]);
    expect(searchResult?.results[0].travelTimes).toEqual(unavailableEstimates);
    expect(timesResult?.results?.[0].travelTimes).toEqual(unavailableEstimates);
    expect(answer.sources.some(({ type }) => type === "routing")).toBe(false);
  });
});
