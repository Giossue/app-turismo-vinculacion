import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import {
  agentChatSchema,
  type AgentChatInput,
} from "../src/ai/application/ai-agent.contracts";
import { nearbyPublishedPlacesInputSchema } from "../src/ai/application/ai-agent.service";
import {
  AiAgentService,
  hasNearbyIntent,
} from "../src/ai/application/ai-agent.service";
import type { PublicEstablishmentSearch } from "../src/ai/application/public-establishment-search";
import type { PublicNearbyEstablishmentSearch } from "../src/ai/application/public-nearby-establishment-search";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";
import type { PublicPoiRepository } from "../src/pois/application/public-poi.repository";
import type { PublicTransportRepository } from "../src/transport/application/public-transport.repository";
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

function service(config: Record<string, unknown>) {
  return new AiAgentService(
    new ConfigService(config),
    repository(),
    establishmentSearch(),
    nearbyEstablishmentSearch(),
    poiRepository(),
    transportRepository(),
  );
}

describe("AiAgentService", () => {
  it("fails closed when the selected provider has no key", async () => {
    await expect(
      service({ AI_PROVIDER: "openai", AI_MODEL: "gpt-5-mini" }).generate({
        message: "Busca un mirador",
        history: [],
      }),
    ).rejects.toThrow("El proveedor de IA no está configurado.");
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

  it("recognizes nearby intent without turning the phrase into a text search", () => {
    expect(hasNearbyIntent("Lo que haya cerca de mí")).toBe(true);
    expect(hasNearbyIntent("qué puedo visitar alrededor")).toBe(true);
    expect(hasNearbyIntent("cuéntame la historia de Guaranda")).toBe(false);
  });

  it("rejects an invalid nearby radius before a tool can query the database", () => {
    expect(
      nearbyPublishedPlacesInputSchema.safeParse({ radiusMeters: 0 }).success,
    ).toBe(false);
    expect(
      nearbyPublishedPlacesInputSchema.safeParse({ radiusMeters: 25_001 })
        .success,
    ).toBe(false);
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

    trusted.set("center:GUA-002", {
      ref: "center:GUA-002",
      card: {
        type: "center",
        code: "GUA-002",
        name: "Segundo centro",
        summary: "Otra descripción oficial",
        category: "Naturaleza",
        latitude: -1.58,
        longitude: -79.01,
        distanceMeters: null,
      },
      destination: {
        type: "center",
        code: "GUA-002",
        name: "Segundo centro",
        latitude: -1.58,
        longitude: -79.01,
      },
      source: {
        type: "center",
        label: "Catálogo de centros turísticos publicados",
      },
    });

    const sanitized = sanitizeAgentResponse(
      {
        text: "Encontré un lugar.",
        cards: [{ ref: "center:GUA-001" }, { ref: "center:inventado" }],
        actions: [
          { type: "open_center", ref: "center:inventado" },
          { type: "start_route", mode: "foot", ref: "center:GUA-001" },
        ],
        itinerary: {
          title: "Paseo publicado",
          summary: "Propuesta verificada.",
          stops: [
            { ref: "center:GUA-002", order: 2 },
            { ref: "center:GUA-001", order: 1 },
            { ref: "center:inventado", order: 3 },
          ],
        },
      },
      trusted,
    );

    expect(sanitized.cards).toHaveLength(1);
    expect(sanitized.actions).toEqual([
      {
        type: "start_route",
        destination: {
          type: "center",
          code: "GUA-001",
          name: "Centro publicado",
          latitude: -1.59,
          longitude: -79,
        },
        mode: "foot",
        requiresConfirmation: true,
      },
    ]);
    expect(sanitized.itinerary).toEqual({
      title: "Paseo publicado",
      summary: "Propuesta verificada.",
      stops: [
        {
          type: "center",
          code: "GUA-001",
          name: "Centro publicado",
          latitude: -1.59,
          longitude: -79,
          order: 1,
        },
        {
          type: "center",
          code: "GUA-002",
          name: "Segundo centro",
          latitude: -1.58,
          longitude: -79.01,
          order: 2,
        },
      ],
    });
  });
});
