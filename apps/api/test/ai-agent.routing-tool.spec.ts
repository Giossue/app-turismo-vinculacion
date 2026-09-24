import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, streamText: vi.fn() };
});

import { streamText } from "ai";

import { AiAgentService } from "../src/ai/application/ai-agent.service";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";
import type { PublicCenter } from "../src/centers/domain/public-center";
import type { PublicEstablishmentSearch } from "../src/ai/application/public-establishment-search";
import type { PublicNearbyEstablishmentSearch } from "../src/ai/application/public-nearby-establishment-search";
import type { PublicPoiRepository } from "../src/pois/application/public-poi.repository";
import type { PublicTransportRepository } from "../src/transport/application/public-transport.repository";
import type { CalculateRouteUseCase } from "../src/routing/application/calculate-route.use-case";

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;
type GenerateOptions = Readonly<{
  tools: Record<string, { execute?: ToolExecutor }>;
}>;

const streamTextMock = vi.mocked(streamText);

const center: PublicCenter = {
  code: "GUA-001",
  name: "Centro Cultural Indio Guaranga",
  description: "Centro publicado",
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

function centers(): PublicCenterRepository {
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
    listPublished: async () => ({ items: [center], total: 1 }),
  };
}

function routeUseCase(): CalculateRouteUseCase {
  return {
    execute: vi.fn().mockResolvedValue({
      mode: "foot",
      distanceMeters: 846,
      durationSeconds: 114.7,
      geometry: {
        type: "LineString",
        coordinates: [
          [-79.001, -1.593],
          [-79, -1.594],
        ],
      },
      steps: [
        {
          instruction: "Gira a la derecha por General Salazar",
          distanceMeters: 846,
          durationSeconds: 114.7,
          name: "General Salazar",
          maneuver: { type: "turn", modifier: "right", exit: null },
        },
      ],
    }),
  } as unknown as CalculateRouteUseCase;
}

function service(calculateRoute: CalculateRouteUseCase) {
  const establishments: PublicEstablishmentSearch = {
    browse: async () => [],
    nearby: async () => ({
      items: [],
      fallbackApplied: false,
      requestedLocalityName: null,
      effectiveLocality: null,
    }),
  };
  const nearbyEstablishments: PublicNearbyEstablishmentSearch = {
    nearby: async () => [],
  };
  const pois: PublicPoiRepository = { listNearby: async () => ({ items: [] }) };
  const transport: PublicTransportRepository = {
    findForPublishedCenter: async () => null,
    listNearbyStops: async () => [],
  };

  return new AiAgentService(
    new ConfigService({
      AI_MODEL: "claude-sonnet-test",
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "test-key",
    }),
    centers(),
    establishments,
    nearbyEstablishments,
    pois,
    transport,
    calculateRoute,
  );
}

describe("AiAgentService calculateRoadRoute tool", () => {
  it("uses a trusted result and approximate origin without exposing coordinates to the tool input", async () => {
    const calculateRoute = routeUseCase();
    const routeExecutor = calculateRoute.execute as ReturnType<typeof vi.fn>;
    let toolRouteResult: unknown;

    streamTextMock.mockImplementation((options) => {
      const tools = (options as unknown as GenerateOptions).tools;
      const output = (async () => {
        const search = await tools.searchPublishedCenters.execute?.({
          limit: 1,
          text: "Centro cultural",
        });
        const ref = (search as { results: [{ ref: string }] }).results[0].ref;
        toolRouteResult = await tools.calculateRoadRoute.execute?.({
          mode: "foot",
          toRef: ref,
        });

        return {
          text: "Ruta vial verificada.",
          cards: [{ ref }],
          actions: [{ type: "start_route", mode: "foot", ref }],
        };
      })();

      return {
        output,
        partialOutputStream: (async function* () {})(),
      } as never;
    });

    const response = await service(calculateRoute).generate({
      message: "¿Cómo llego al centro cultural?",
      history: [],
      location: {
        latitude: -1.59263,
        longitude: -79.00098,
        accuracyMeters: 45,
      },
    });

    expect(routeExecutor).toHaveBeenCalledWith({
      destination: {
        latitude: -1.594,
        longitude: -79,
      },
      mode: "foot",
      origin: { latitude: -1.593, longitude: -79.001 },
    });
    expect(toolRouteResult).toMatchObject({
      approximateOrigin: true,
      distanceMeters: 846,
      durationSeconds: 114.7,
      found: true,
    });
    expect(response.sources).toContainEqual({
      type: "routing",
      label: "Cálculo de ruta vial",
    });
    expect(response.actions).toEqual([
      {
        type: "start_route",
        destination: {
          type: "center",
          code: "GUA-001",
          name: "Centro Cultural Indio Guaranga",
          latitude: -1.594,
          longitude: -79,
        },
        mode: "foot",
        requiresConfirmation: true,
      },
    ]);
  });
});
