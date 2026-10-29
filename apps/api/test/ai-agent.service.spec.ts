import { ConfigService } from "@nestjs/config";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import {
  agentChatSchema,
  type AgentChatInput,
} from "../src/ai/application/ai-agent.contracts";
import { searchPlacesInputSchema } from "../src/ai/application/ai-agent.service";
import {
  AiAgentService,
  hasNearbyIntent,
  hasPlaceDetailIntent,
  hasTravelTimeIntent,
} from "../src/ai/application/ai-agent.service";
import type { PublicEstablishmentSearch } from "../src/ai/application/public-establishment-search";
import type { PublicNearbyEstablishmentSearch } from "../src/ai/application/public-nearby-establishment-search";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";
import type { PublicPoiRepository } from "../src/pois/application/public-poi.repository";
import type { PublicTransportRepository } from "../src/transport/application/public-transport.repository";
import type { CalculateRouteUseCase } from "../src/routing/application/calculate-route.use-case";
import {
  sanitizeAgentResponse,
  type TrustedAgentEntity,
} from "../src/ai/infrastructure/ai-agent-trusted-data";

function repository(): PublicCenterRepository {
  return {
    getDiscoveryCatalog: async () => ({
      categories: [],
      types: [],
      subtypes: [],
      provinces: [],
      cantons: [],
      parishes: [],
      hierarchies: [],
    }),
    findPublishedByCode: async () => null,
    listNearbyPublished: async () => ({ items: [] }),
    listPublished: async () => ({ items: [], total: 0 }),
  };
}

function poiRepository(): PublicPoiRepository {
  return { listNearby: async () => ({ items: [] }) };
}

function establishmentSearch(): PublicEstablishmentSearch {
  return {
    browse: async () => [],
    nearby: async () => ({
      items: [],
      fallbackApplied: false,
      requestedLocalityName: null,
      effectiveLocality: null,
    }),
  };
}

function nearbyEstablishmentSearch(): PublicNearbyEstablishmentSearch {
  return { nearby: async () => [] };
}

function transportRepository(): PublicTransportRepository {
  return {
    findForPublishedCenter: async () => null,
    listNearbyStops: async () => [],
  };
}

function routeUseCase(): CalculateRouteUseCase {
  return {
    execute: async () => ({
      mode: "foot",
      distanceMeters: 420,
      durationSeconds: 360,
      geometry: {
        type: "LineString",
        coordinates: [
          [-79.0, -1.59],
          [-79.001, -1.591],
        ],
      },
      steps: [],
    }),
  } as unknown as CalculateRouteUseCase;
}

function service(config: Record<string, unknown>) {
  return new AiAgentService(
    new ConfigService(config),
    repository(),
    establishmentSearch(),
    nearbyEstablishmentSearch(),
    poiRepository(),
    transportRepository(),
    routeUseCase(),
  );
}

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};
const modelTurn = (chunks: unknown[]) => ({
  stream: simulateReadableStream({ chunks: chunks as never[] }),
});
const toolCallTurn = (toolName: string, input: unknown) =>
  modelTurn([
    { type: "stream-start", warnings: [] },
    {
      type: "tool-call",
      toolCallId: `call-${toolName}`,
      toolName,
      input: JSON.stringify(input),
    },
    {
      type: "finish",
      finishReason: { unified: "tool-calls", raw: "tool_calls" },
      usage,
    },
  ]);
const textTurn = (text: string) =>
  modelTurn([
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: "stop" },
      usage,
    },
  ]);

describe("AiAgentService", () => {
  it("reports each tool call with its input and output to the trace hook", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", {
          type: "lodging",
          text: "glamping",
        }),
        textTurn("No encontré alojamientos."),
      ],
    });
    const agent = service({ AI_PROVIDER: "openai", AI_MODEL: "x" });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: unknown[] = [];

    const answer = await agent.generate(
      { message: "¿Dónde puedo hospedarme?", history: [] },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry) },
    );

    expect(answer.text).toContain("alojamientos");
    expect(trace).toEqual([
      {
        tool: "searchPlaces",
        input: {
          type: "lodging",
          nearby: false,
          radiusMeters: 5_000,
          limit: 6,
          text: "glamping",
        },
        output: expect.objectContaining({ total: 0, results: [] }),
      },
    ]);
  });

  it("offers a location action for nearby requests even when the model provider is offline", async () => {
    await expect(
      service({ AI_PROVIDER: "openai", AI_MODEL: "gpt-5-mini" }).generate({
        message: "¿Qué hay cerca de mí?",
        history: [],
      }),
    ).resolves.toMatchObject({
      actions: [{ type: "request_location" }],
    });
  });

  it("lets the model retry with another kind after an empty forced search", async () => {
    const glamping = {
      nombreComercial: "La Tola Glamping",
      actividad: "PARQUES DE ATRACCIONES ESTABLES",
      clasificacion: "PARQUE DE ATRACCIONES ESTABLES",
      categoria: "Categoría única",
      direccion: null,
      telefono: null,
      latitude: -1.6,
      longitude: -79,
      distanceMeters: null,
      localityName: "San Lorenzo",
    };
    const browse = vi.fn(async (query: { kind: string }) =>
      query.kind === "other" ? [glamping] : [],
    );
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      repository(),
      { ...establishmentSearch(), browse },
      nearbyEstablishmentSearch(),
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", {
          type: "lodging",
          text: "glamping",
        }),
        toolCallTurn("searchPlaces", {
          type: "establishment",
          text: "glamping",
        }),
        textTurn("Te recomiendo La Tola Glamping."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: Record<string, unknown> }[] = [];

    await agent.generate(
      { message: "¿Dónde puedo hospedarme?", history: [] },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(browse.mock.calls.map(([query]) => query.kind)).toEqual([
      "lodging",
      "other",
    ]);
    expect(trace[0].output.hint).toEqual(
      expect.stringContaining("type establishment"),
    );
    expect(trace[1].output).toMatchObject({ total: 1 });
  });

  it("lists the whole published catalog compactly for everyday wording", async () => {
    const item = (name: string, activity: string) => ({
      nombreComercial: name,
      actividad: activity,
      clasificacion: null,
      categoria: null,
      direccion: "Calle 1",
      telefono: null,
      latitude: null,
      longitude: null,
      distanceMeters: null,
      localityName: "Guaranda",
    });
    const browse = vi.fn(async () => [
      item("La Tola Glamping", "PARQUES DE ATRACCIONES ESTABLES"),
      item("Hostal La Rueda", "ALOJAMIENTO"),
    ]);
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      repository(),
      { ...establishmentSearch(), browse },
      nearbyEstablishmentSearch(),
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", { type: "establishment", limit: 50 }),
        toolCallTurn("showPlaceCards", { refs: ["establishment:1"] }),
        textTurn("Prueba La Tola Glamping."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: Record<string, unknown> }[] = [];

    const answer = await agent.generate(
      { message: "Quiero ir a un glamping", history: [] },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(browse).toHaveBeenCalledWith({
      kind: "other",
      text: undefined,
      locality: undefined,
      limit: 50,
    });
    expect(trace[0].output).toMatchObject({ total: 2 });
    expect(answer.cards.map((card) => card.name)).toEqual(["La Tola Glamping"]);
  });

  it("finds an establishment by name when no center matches", async () => {
    const tola = {
      nombreComercial: "La Tola Glamping",
      actividad: "PARQUES DE ATRACCIONES ESTABLES",
      clasificacion: "PARQUE DE ATRACCIONES ESTABLES",
      categoria: "Categoría única",
      direccion: null,
      telefono: null,
      latitude: -1.6,
      longitude: -79,
      distanceMeters: null,
      localityName: "San Lorenzo",
    };
    const browse = vi.fn(async () => [tola]);
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      repository(),
      { ...establishmentSearch(), browse },
      nearbyEstablishmentSearch(),
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", { text: "La Tola" }),
        toolCallTurn("showPlaceCards", { refs: ["establishment:1"] }),
        textTurn("Es un glamping en San Lorenzo."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: Record<string, unknown> }[] = [];

    const answer = await agent.generate(
      { message: "Cuéntame sobre La Tola", history: [] },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(browse).toHaveBeenCalledWith({
      kind: "other",
      text: "La Tola",
      locality: undefined,
      limit: 6,
    });
    expect(trace[0].output).toMatchObject({ total: 1, locationBased: false });
    expect(answer.cards.map((card) => card.name)).toEqual(["La Tola Glamping"]);
    const offered = model.doStreamCalls[0].tools?.map((tool) => tool.name);
    expect(offered).toContain("searchPlaces");
    for (const retired of [
      "searchNearbyEstablishments",
      "searchPublishedCenters",
      "searchPublishedEstablishments",
      "listPublishedCenters",
      "listPublishedEstablishments",
      "searchNearbyPublishedPlaces",
    ]) {
      expect(offered).not.toContain(retired);
    }
  });

  it("reports the nearest place outside the radius instead of presenting it as nearby", async () => {
    const far = {
      code: "CT-FAR",
      name: "Cascada Lejana",
      description: null,
      category: "Naturaleza",
      type: "Cascada",
      latitude: -1.2,
      longitude: -78.6,
      distanceMeters: 48_000,
    };
    const listNearbyPublished = vi.fn(
      async (query: { radiusMeters: number }) => ({
        items: query.radiusMeters > 5_000 ? [far] : [],
      }),
    );
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      { ...repository(), listNearbyPublished } as never,
      establishmentSearch(),
      nearbyEstablishmentSearch(),
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", {
          nearby: true,
          radiusMeters: 5_000,
          limit: 6,
        }),
        textTurn("Cerca no hay nada; lo más próximo está a 48 km."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: Record<string, unknown> }[] = [];

    await agent.generate(
      {
        message: "¿Qué hay cerca de mí?",
        history: [],
        location: { latitude: -1.59, longitude: -79.0 },
      },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(listNearbyPublished.mock.calls.map(([q]) => q.radiusMeters)).toEqual(
      [5_000, 300_000],
    );
    expect(trace[0].output).toMatchObject({
      total: 0,
      results: [],
      outsideRadius: { name: "Cascada Lejana", distanceMeters: 48_000 },
    });
    expect(String(trace[0].output.message)).not.toContain("en español");
  });

  it("tells the model to retry in Spanish when a nearby text filter finds nothing", async () => {
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      {
        ...repository(),
        listNearbyPublished: async () => ({ items: [] }),
      } as never,
      establishmentSearch(),
      { nearby: async () => [] },
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", { nearby: true, text: "coffee" }),
        textTurn("No encontré cafeterías."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: { message: string } }[] = [];

    await agent.generate(
      {
        message: "any coffee shops near me?",
        history: [],
        location: { latitude: -1.59, longitude: -79.0 },
      },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(trace[0].output.message).toContain("text en español");
  });

  it("filters nearby establishments by food type inside the radius", async () => {
    const place = (
      name: string,
      activity: string,
      classification: string | null,
    ) => ({
      nombreComercial: name,
      actividad: activity,
      clasificacion: classification,
      categoria: null,
      direccion: null,
      telefono: null,
      latitude: -1.59,
      longitude: -79,
      distanceMeters: 300,
      localityName: "Guaranda",
    });
    const food = "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO";
    const nearby = vi.fn(async () => [
      place("Restaurante Sol", food, "RESTAURANTE"),
      place("Pizzería sin clasificar", food, null),
      place("Discoteca Luna", food, "DISCOTECA"),
      place("Hostal Rueda", "ALOJAMIENTO", "HOSTAL"),
    ]);
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      repository(),
      establishmentSearch(),
      { nearby },
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", { nearby: true, type: "food" }),
        textTurn("Hay dos lugares para comer."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);
    const trace: { output: { results: { name: string }[] } }[] = [];

    await agent.generate(
      {
        message: "restaurantes cerca de mí",
        history: [],
        location: { latitude: -1.59, longitude: -79.0 },
      },
      undefined,
      undefined,
      { onToolTrace: (entry) => trace.push(entry as never) },
    );

    expect(trace[0].output.results.map((item) => item.name)).toEqual([
      "Pizzería sin clasificar",
      "Restaurante Sol",
    ]);
  });

  it("falls back to automatic tool choice when the provider rejects a forced tool", async () => {
    const rejection = Object.assign(
      new Error(
        'tool_choice: type "tool" and "any" are not supported for this model.',
      ),
      { statusCode: 400 },
    );
    const lodging = {
      nombreComercial: "Hostal La Rueda",
      actividad: "ALOJAMIENTO",
      clasificacion: "HOSTAL",
      categoria: null,
      direccion: null,
      telefono: null,
      latitude: -1.6,
      longitude: -79,
      distanceMeters: null,
      localityName: "Guaranda",
    };
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "anthropic", AI_MODEL: "sin-forzado" }),
      repository(),
      { ...establishmentSearch(), browse: async () => [lodging] },
      nearbyEstablishmentSearch(),
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const replies = () => [
      toolCallTurn("searchPlaces", { type: "lodging" }),
      toolCallTurn("showPlaceCards", { refs: ["establishment:1"] }),
      textTurn("Prueba el Hostal La Rueda."),
    ];
    const queue = [...replies(), ...replies()];
    const model = new MockLanguageModelV4({
      doStream: async (options) => {
        if (options.toolChoice?.type === "tool") throw rejection;
        return queue.shift()!;
      },
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);

    const ask = () =>
      agent.generate({ message: "¿Dónde puedo hospedarme?", history: [] });
    const first = await ask();
    expect(first.cards.map((card) => card.name)).toEqual(["Hostal La Rueda"]);
    const forcedAfterFirst = model.doStreamCalls.filter(
      (call) => call.toolChoice?.type === "tool",
    ).length;
    expect(forcedAfterFirst).toBe(1);

    await ask();
    const forcedAfterSecond = model.doStreamCalls.filter(
      (call) => call.toolChoice?.type === "tool",
    ).length;
    expect(forcedAfterSecond).toBe(1);
  });

  it("keeps the model answer when a lodging question is resolved with a nearby search", async () => {
    const hotel = {
      nombreComercial: "Hotel Márquez",
      actividad: "ALOJAMIENTO",
      clasificacion: "HOTEL",
      categoria: null,
      direccion: null,
      telefono: null,
      latitude: -1.59,
      longitude: -79,
      distanceMeters: 400,
      localityName: "Guaranda",
    };
    const agent = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "x" }),
      repository(),
      establishmentSearch(),
      { nearby: async () => [hotel] },
      poiRepository(),
      transportRepository(),
      routeUseCase(),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        toolCallTurn("searchPlaces", { type: "lodging", nearby: true }),
        toolCallTurn("showPlaceCards", { refs: ["establishment:1"] }),
        textTurn("There is a hotel 400 m away."),
      ],
    });
    vi.spyOn(
      agent as unknown as { model: () => unknown },
      "model",
    ).mockReturnValue(model);

    const answer = await agent.generate({
      message: "is there a hotel close to me?",
      history: [],
      location: { latitude: -1.59, longitude: -79.0 },
    });

    expect(answer.text).toBe("There is a hotel 400 m away.");
    expect(answer.cards.map((card) => card.name)).toEqual(["Hotel Márquez"]);
  });

  it("fails closed when the selected provider has no key", async () => {
    await expect(
      service({ AI_PROVIDER: "openai", AI_MODEL: "gpt-5-mini" }).generate({
        message: "Busca un mirador",
        history: [],
      }),
    ).rejects.toThrow("No puedo responder ahora. Inténtalo de nuevo.");
  });

  it("accepts an approximate location but rejects invalid or extra input", () => {
    const valid: AgentChatInput = {
      message: "Busca un restaurante cerca",
      history: [],
      location: {
        latitude: -1.59,
        longitude: -79.0,
        accuracyMeters: 45,
      },
    };
    expect(agentChatSchema.parse(valid)).toEqual(valid);
    expect(
      agentChatSchema.safeParse({
        ...valid,
        location: { latitude: 120, longitude: -79 },
      }).success,
    ).toBe(false);
    expect(
      agentChatSchema.safeParse({ ...valid, locationHistory: [] }).success,
    ).toBe(false);
  });

  it("accepts the interface language of the mobile app", () => {
    const input = { message: "Where can I eat?", history: [] };
    expect(agentChatSchema.parse({ ...input, language: "en" }).language).toBe(
      "en",
    );
    expect(agentChatSchema.parse(input).language).toBeUndefined();
    expect(
      agentChatSchema.safeParse({ ...input, language: "fr" }).success,
    ).toBe(false);
  });

  it("recognizes nearby intent without turning the phrase into a text search", () => {
    expect(hasNearbyIntent("Lo que haya cerca de mí")).toBe(true);
    expect(hasNearbyIntent("qué puedo visitar alrededor")).toBe(true);
    expect(hasNearbyIntent("What is nearby?")).toBe(true);
    expect(hasNearbyIntent("Busca sitios desde aquí")).toBe(true);
    expect(hasNearbyIntent("Usa mi ubicación")).toBe(true);
    expect(hasNearbyIntent("cuéntame la historia de Guaranda")).toBe(false);
  });

  it("recognizes arrival-time questions without treating named origins as the visitor", () => {
    expect(hasTravelTimeIntent("¿A cuántos minutos está el museo?")).toBe(true);
    expect(hasTravelTimeIntent("¿Cuánto me demoro en llegar?")).toBe(true);
    expect(hasTravelTimeIntent("¿Cómo llego al museo?")).toBe(false);
    expect(hasTravelTimeIntent("¿Cómo llegar al museo?")).toBe(false);
    expect(hasTravelTimeIntent("How long does it take to get there?")).toBe(
      true,
    );
    expect(hasTravelTimeIntent("¿Cómo llegar de Guaranda a Riobamba?")).toBe(
      false,
    );
    expect(
      hasTravelTimeIntent(
        "¿Cuánto tiempo tarda desde el museo hasta el parque?",
      ),
    ).toBe(false);
    expect(hasTravelTimeIntent("¿Dónde puedo comer?")).toBe(false);
    expect(
      hasTravelTimeIntent(
        "¿Cuánto tiempo tardo en llegar al museo de Guaranda a pie?",
      ),
    ).toBe(true);
    expect(
      hasTravelTimeIntent("How long does it take from Quito to Guaranda?"),
    ).toBe(false);
    expect(hasTravelTimeIntent("How long has the museum been open?")).toBe(
      false,
    );
    expect(
      hasTravelTimeIntent("¿Cuánto tiempo tarda la visita al museo?"),
    ).toBe(false);
  });

  it("rejects an invalid nearby radius before a tool can query the database", () => {
    expect(
      searchPlacesInputSchema.safeParse({ nearby: true, radiusMeters: 0 })
        .success,
    ).toBe(false);
    expect(
      searchPlacesInputSchema.safeParse({ nearby: true, radiusMeters: 25_001 })
        .success,
    ).toBe(false);
  });

  it("distinguishes a focused question from discovery even when it names a tourism type", () => {
    expect(hasPlaceDetailIntent("Cuéntame del Hotel Central")).toBe(true);
    expect(
      hasPlaceDetailIntent(
        "¿Cuánto cuesta la entrada del atractivo turístico X?",
      ),
    ).toBe(true);
    expect(hasPlaceDetailIntent("¿Cómo llego al Restaurante X?")).toBe(true);
    expect(hasPlaceDetailIntent("Quiero llegar al Hotel Central")).toBe(true);
    expect(
      hasPlaceDetailIntent(
        "¿A cómo está la entrada del atractivo turístico X?",
      ),
    ).toBe(true);
    expect(hasPlaceDetailIntent("Tell me about Hotel Central")).toBe(true);
    expect(hasPlaceDetailIntent("¿Qué lugares turísticos puedo visitar?")).toBe(
      false,
    );
    expect(hasPlaceDetailIntent("¿Dónde puedo comer?")).toBe(false);
    expect(hasPlaceDetailIntent("Hoteles en Guaranda")).toBe(false);
  });

  it("drops model-selected references that did not come from tools", () => {
    const trusted = new Map<string, TrustedAgentEntity>([
      [
        "center:GUA-001",
        {
          ref: "center:GUA-001",
          card: {
            type: "center",
            code: "GUA-001",
            name: "Centro publicado",
            summary: "Descripción oficial",
            category: "Naturaleza",
            latitude: -1.59,
            longitude: -79,
            distanceMeters: null,
          },
          destination: {
            type: "center",
            code: "GUA-001",
            name: "Centro publicado",
            latitude: -1.59,
            longitude: -79,
          },
          source: {
            type: "center",
            label: "Catálogo de centros turísticos publicados",
          },
        },
      ],
    ]);

    const sanitized = sanitizeAgentResponse(
      {
        text: "Encontré un lugar.",
        cards: [{ ref: "center:GUA-001" }, { ref: "center:inventado" }],
        actions: [
          { type: "open_center", ref: "center:inventado" },
          { type: "start_route", mode: "foot", ref: "center:GUA-001" },
        ],
      },
      trusted,
    );

    expect(sanitized.cards).toEqual([trusted.get("center:GUA-001")?.card]);
    expect(sanitized.actions).toEqual([]);
  });
});
