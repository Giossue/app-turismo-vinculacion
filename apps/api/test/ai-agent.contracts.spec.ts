import { describe, expect, it } from "vitest";

import {
  agentResponseSchema,
  agentChatSchema,
  agentModelResponseSchema,
  agentTravelTimesSchema,
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

  it("requires one estimate per mode and distinguishes absent routes from metrics", () => {
    const estimates = [
      {
        mode: "car",
        status: "available",
        durationSeconds: 120,
        distanceMeters: 900,
      },
      { mode: "foot", status: "no_route" },
      { mode: "bicycle", status: "unavailable" },
    ];
    expect(agentTravelTimesSchema.safeParse(estimates).success).toBe(true);
    expect(
      agentTravelTimesSchema.safeParse([
        estimates[0],
        estimates[0],
        estimates[2],
      ]).success,
    ).toBe(false);
    expect(
      agentTravelTimesSchema.safeParse(estimates.slice(0, 2)).success,
    ).toBe(false);
    expect(
      agentTravelTimesSchema.safeParse([
        estimates[0],
        { ...estimates[1], durationSeconds: 0 },
        estimates[2],
      ]).success,
    ).toBe(false);
    for (const durationSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        agentTravelTimesSchema.safeParse([
          { ...estimates[0], durationSeconds },
          estimates[1],
          estimates[2],
        ]).success,
      ).toBe(false);
    }
  });

  it("does not let the model supply travel-time numbers in cards", () => {
    expect(
      agentModelResponseSchema.safeParse({
        text: "Está a dos minutos.",
        cards: [
          {
            ref: "center:GUA-001",
            travelTimes: [
              {
                mode: "car",
                status: "available",
                durationSeconds: 120,
                distanceMeters: 900,
              },
            ],
          },
        ],
        actions: [],
      }).success,
    ).toBe(false);
  });
});
