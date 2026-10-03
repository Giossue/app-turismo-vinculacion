import { describe, expect, it } from "vitest";

import {
  sanitizeAgentResponse,
  type TrustedAgentEntity,
} from "../src/ai/infrastructure/ai-agent-trusted-data";

function center(code: string): TrustedAgentEntity {
  return {
    ref: `center:${code}`,
    card: {
      type: "center",
      code,
      name: `Lugar ${code}`,
      summary: "Descripción oficial",
      category: "Manifestaciones culturales",
      latitude: -1.59,
      longitude: -79,
      distanceMeters: null,
    },
    destination: {
      type: "center",
      code,
      name: `Lugar ${code}`,
      latitude: -1.59,
      longitude: -79,
    },
    source: { type: "center", label: "Ficha pública" },
  };
}

const poi: TrustedAgentEntity = {
  ref: "poi:1",
  card: {
    type: "poi",
    name: "Plaza cultural",
    summary: "Descripción oficial",
    category: "Punto de interés",
    localityName: "Guaranda",
    latitude: -1.591,
    longitude: -79.001,
    distanceMeters: 180,
  },
  destination: {
    type: "poi",
    name: "Plaza cultural",
    latitude: -1.591,
    longitude: -79.001,
  },
  source: { type: "poi", label: "Catálogo público geolocalizado" },
};

const withoutCoordinate: TrustedAgentEntity = {
  ref: "establishment:1",
  card: {
    type: "establishment",
    name: "Restaurante",
    summary: "Restaurante",
    category: "RESTAURANTE",
    address: null,
    phone: null,
    localityName: "Guaranda",
    latitude: null,
    longitude: null,
    distanceMeters: null,
  },
  destination: null,
  source: { type: "establishment", label: "Catastro turístico público" },
};

describe("agent cards instead of separate model actions", () => {
  it("recovers a center card from an open action without changing the answer", () => {
    const place = center("GUA-001");
    const answer = sanitizeAgentResponse(
      {
        text: "La entrada cuesta $2.",
        cards: [],
        actions: [{ type: "open_center", ref: place.ref }],
      },
      new Map([[place.ref, place]]),
    );
    expect(answer).toEqual({
      text: "La entrada cuesta $2.",
      cards: [place.card],
      actions: [],
      sources: [place.source],
    });
  });

  it("recovers the trusted POI card from a route action and emits no navigation", () => {
    const answer = sanitizeAgentResponse(
      {
        text: "Pulsa Ver y luego Cómo llegar.",
        cards: [],
        actions: [{ type: "start_route", mode: "foot", ref: poi.ref }],
      },
      new Map([[poi.ref, poi]]),
    );
    expect(answer.cards).toEqual([poi.card]);
    expect(answer.actions).toEqual([]);
  });

  it("keeps explicit cards first and deduplicates references from both lists", () => {
    const first = center("GUA-001");
    const second = center("GUA-002");
    const answer = sanitizeAgentResponse(
      {
        text: "Puedes visitar estos lugares.",
        cards: [{ ref: first.ref }, { ref: first.ref }],
        actions: [
          { type: "start_route", mode: "car", ref: first.ref },
          { type: "open_center", ref: second.ref },
          { type: "open_center", ref: second.ref },
          { type: "open_center", ref: "center:inventado" },
        ],
      },
      new Map([
        [first.ref, first],
        [second.ref, second],
      ]),
    );
    expect(answer.cards).toEqual([first.card, second.card]);
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([first.source]);
  });

  it("ignores unknown references and actions that do not fit their trusted target", () => {
    const answer = sanitizeAgentResponse(
      {
        text: "No encontré una ruta.",
        cards: [{ ref: "center:inventado" }],
        actions: [
          { type: "open_center", ref: poi.ref },
          { type: "start_route", mode: "foot", ref: withoutCoordinate.ref },
          { type: "start_route", mode: "car", ref: "center:inventado" },
        ],
      },
      new Map([
        [poi.ref, poi],
        [withoutCoordinate.ref, withoutCoordinate],
      ]),
    );
    expect(answer.cards).toEqual([]);
    expect(answer.actions).toEqual([]);
    expect(answer.sources).toEqual([]);
  });

  it("caps the combined card list at six", () => {
    const places = Array.from({ length: 7 }, (_, index) => center(`GUA-${index}`));
    const answer = sanitizeAgentResponse(
      {
        text: "Puedes visitar estos lugares.",
        cards: places.slice(0, 6).map(({ ref }) => ({ ref })),
        actions: [{ type: "open_center", ref: places[6].ref }],
      },
      new Map(places.map((place) => [place.ref, place])),
    );
    expect(answer.cards).toEqual(places.slice(0, 6).map(({ card }) => card));
    expect(answer.actions).toEqual([]);
  });
});
