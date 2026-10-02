import { describe, expect, it } from "vitest";

import {
  agentResponseSchema,
  type AgentCard,
  type AgentTravelTime,
} from "./agent";

const cards: readonly AgentCard[] = [
  {
    type: "center",
    code: "GUA-001",
    name: "Centro publicado",
    summary: "Un lugar turístico.",
    category: "Atractivo",
    latitude: -1.59,
    longitude: -79,
    distanceMeters: 300,
  },
  {
    type: "establishment",
    name: "Restaurante publicado",
    summary: "Comida local.",
    category: "Restaurante",
    address: null,
    phone: null,
    localityName: "Guaranda",
    latitude: -1.59,
    longitude: -79,
    distanceMeters: 300,
  },
  {
    type: "poi",
    name: "Plaza pública",
    summary: "Una plaza.",
    category: "Punto de interés",
    localityName: "Guaranda",
    latitude: -1.59,
    longitude: -79,
    distanceMeters: 300,
  },
];

const travelTimes: readonly AgentTravelTime[] = [
  { mode: "car", status: "available", durationSeconds: 0, distanceMeters: 0 },
  { mode: "foot", status: "no_route" },
  { mode: "bicycle", status: "unavailable" },
];

function parseCard(card: unknown) {
  return agentResponseSchema.safeParse({
    text: "Encontré este lugar.",
    cards: [card],
    actions: [],
    sources: [],
  });
}

describe("agent travel time contract", () => {
  it.each(cards)("accepts the three states on a $type card", (card) => {
    const result = parseCard({ ...card, travelTimes });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cards[0].travelTimes).toEqual(travelTimes);
    }
  });

  it.each(cards)(
    "keeps a $type response without travel times compatible",
    (card) => {
      const result = parseCard(card);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cards[0]).not.toHaveProperty("travelTimes");
      }
    },
  );

  it("requires exactly one estimate per mode", () => {
    expect(
      parseCard({ ...cards[0], travelTimes: travelTimes.slice(0, 2) }).success,
    ).toBe(false);
    expect(
      parseCard({ ...cards[0], travelTimes: [...travelTimes, travelTimes[0]] })
        .success,
    ).toBe(false);
    expect(
      parseCard({
        ...cards[0],
        travelTimes: [travelTimes[0], travelTimes[0], travelTimes[2]],
      }).success,
    ).toBe(false);
  });

  it.each(["durationSeconds", "distanceMeters"] as const)(
    "rejects invalid %s without coercion",
    (metric) => {
      for (const invalidValue of [
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        null,
        "120",
      ]) {
        expect(
          parseCard({
            ...cards[0],
            travelTimes: [
              { ...travelTimes[0], [metric]: invalidValue },
              travelTimes[1],
              travelTimes[2],
            ],
          }).success,
        ).toBe(false);
      }
    },
  );

  it("rejects missing available metrics and fabricated metrics on absent routes", () => {
    for (const invalidEstimate of [
      { mode: "car", status: "available", durationSeconds: 120 },
      {
        mode: "car",
        status: "no_route",
        durationSeconds: 0,
        distanceMeters: 0,
      },
      { mode: "car", status: "unavailable", durationSeconds: 0 },
      { mode: "bus", status: "unavailable" },
      { mode: "car", status: "estimated" },
    ]) {
      expect(
        parseCard({
          ...cards[0],
          travelTimes: [invalidEstimate, travelTimes[1], travelTimes[2]],
        }).success,
      ).toBe(false);
    }
  });
});
