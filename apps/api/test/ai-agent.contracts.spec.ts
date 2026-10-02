import { describe, expect, it } from "vitest";

import {
  agentResponseSchema,
  agentChatSchema,
  agentModelResponseSchema,
} from "../src/ai/application/ai-agent.contracts";

describe("AI agent contracts", () => {
  it("rejects the retired itinerary field in model and public responses", () => {
    const response = {
      text: "Lugares publicados",
      cards: [],
      actions: [],
      itinerary: {
        title: "Plan",
        summary: "Paseo",
        stops: [
          { ref: "center:GUA-001", order: 1 },
          { ref: "center:GUA-002", order: 2 },
        ],
      },
    };
    expect(agentModelResponseSchema.safeParse(response).success).toBe(false);
    expect(
      agentResponseSchema.safeParse({
        ...response,
        sources: [],
        itinerary: {
          ...response.itinerary,
          stops: ["GUA-001", "GUA-002"].map((code, index) => ({
            type: "center",
            code,
            name: "Centro publicado",
            latitude: -1.59,
            longitude: -79,
            order: index + 1,
          })),
        },
      }).success,
    ).toBe(false);
  });

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

  it("accepts only the location request action shape", () => {
    const response = {
      text: "Necesito tu ubicación actual.",
      cards: [],
      actions: [{ type: "request_location" }],
      sources: [],
    };
    expect(agentResponseSchema.safeParse(response).success).toBe(true);
    expect(
      agentResponseSchema.safeParse({
        ...response,
        actions: [{ type: "request_location", latitude: -1.59 }],
      }).success,
    ).toBe(false);
  });
});
