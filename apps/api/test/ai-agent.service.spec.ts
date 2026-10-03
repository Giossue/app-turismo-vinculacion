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

describe("AiAgentService", () => {
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
    expect(hasTravelTimeIntent("¿Cómo llego al museo?")).toBe(true);
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
