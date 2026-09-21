import { describe, expect, it } from "vitest";

import {
  agentResponseSchema,
  agentChatSchema,
} from "../src/ai/application/ai-agent.contracts";

describe("AI agent contracts", () => {
  it("validates a response envelope with safe route confirmation", () => {
    const result = agentResponseSchema.safeParse({
      text: "Puedes preparar una ruta.",
      cards: [
        {
          type: "center",
          code: "GUA-001",
          name: "Centro publicado",
          summary: "Descripción oficial",
          category: "Naturaleza",
          latitude: -1.59,
          longitude: -79,
          distanceMeters: null,
        },
      ],
      itinerary: {
        title: "Paseo de naturaleza",
        summary: "Propuesta de recorrido con lugares publicados.",
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
            name: "Segundo lugar",
            latitude: -1.58,
            longitude: -79.01,
            order: 2,
          },
        ],
      },
      actions: [
        {
          type: "start_route",
          destination: {
            type: "center",
            code: "GUA-001",
            name: "Centro publicado",
            latitude: -1.59,
            longitude: -79,
          },
          mode: "car",
          requiresConfirmation: true,
        },
      ],
      sources: [{ type: "center", label: "Ficha pública" }],
    });

    expect(result.success).toBe(true);
  });

  it("does not accept an action that can start without confirmation", () => {
    const result = agentResponseSchema.safeParse({
      text: "Ruta",
      cards: [],
      actions: [
        {
          type: "start_route",
          destination: {
            type: "center",
            code: "GUA-001",
            name: "Centro",
            latitude: -1.59,
            longitude: -79,
          },
          mode: "car",
          requiresConfirmation: false,
        },
      ],
      sources: [],
    });

    expect(result.success).toBe(false);
  });

  it("keeps location optional for general questions", () => {
    expect(
      agentChatSchema.safeParse({ message: "¿Qué puedo visitar?" }).success,
    ).toBe(true);
  });
});
