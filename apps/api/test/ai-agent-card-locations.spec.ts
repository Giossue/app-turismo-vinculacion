import { describe, expect, it, vi } from "vitest";

import {
  agentResponseSchema,
  type AgentResponse,
} from "../src/ai/application/ai-agent.contracts";
import { enrichAgentCenterLocations } from "../src/ai/infrastructure/ai-agent-trusted-data";
import type {
  DiscoveryCatalog,
  PublicCenter,
  PublicCenterDetail,
} from "../src/centers/domain/public-center";

const center: PublicCenter = {
  code: "GUA-001",
  name: "Centro Cultural Indio Guaranga",
  description: "Descripción oficial",
  latitude: -1.59,
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
const detail: PublicCenterDetail = {
  ...center,
  address: " Calle Sucre ",
  touristZone: "Zona central",
  altitudeMeters: null,
  admission: null,
  activities: [],
  accessibility: [],
  facilities: [],
  photos: [],
};
const catalog: DiscoveryCatalog = {
  categories: [],
  types: [],
  subtypes: [],
  provinces: [],
  cantons: [{ code: "0201", name: "Guaranda", provinceCode: "02" }],
  parishes: [],
  hierarchies: [],
};
const response: AgentResponse = {
  text: "Encontré un lugar publicado.",
  cards: [
    {
      type: "center",
      code: center.code,
      name: center.name,
      summary: "Descripción oficial",
      category: center.category,
      latitude: center.latitude,
      longitude: center.longitude,
      distanceMeters: 180,
      travelTimes: [
        {
          mode: "car",
          status: "available",
          durationSeconds: 120,
          distanceMeters: 900,
        },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "unavailable" },
      ],
    },
    {
      type: "poi",
      name: "Plaza cultural",
      summary: "Un punto de interés publicado.",
      category: "Punto de interés",
      localityName: "Guaranda",
      latitude: -1.592,
      longitude: -79.001,
      distanceMeters: 190,
    },
  ],
  actions: [],
  sources: [{ type: "center", label: "Ficha pública" }],
};

describe("agent center locations from trusted public records", () => {
  it("enriches only selected centers and keeps categories, times and other cards", async () => {
    const findPublishedByCode = vi.fn().mockResolvedValue(detail);
    const getDiscoveryCatalog = vi.fn().mockResolvedValue(catalog);
    const answer = await enrichAgentCenterLocations(
      response,
      { findPublishedByCode, getDiscoveryCatalog },
      new Map([[center.code, center]]),
    );

    expect(answer.cards).toEqual([
      {
        ...response.cards[0],
        address: "Calle Sucre",
        localityName: "Guaranda",
      },
      response.cards[1],
    ]);
    expect(findPublishedByCode).toHaveBeenCalledExactlyOnceWith(center.code);
    expect(getDiscoveryCatalog).toHaveBeenCalledTimes(1);
    expect(agentResponseSchema.parse(answer)).toEqual(answer);
  });

  it("reuses a published detail already recovered by a tool", async () => {
    const findPublishedByCode = vi.fn();
    const answer = await enrichAgentCenterLocations(
      response,
      {
        findPublishedByCode,
        getDiscoveryCatalog: async () => catalog,
      },
      new Map([[center.code, detail]]),
    );
    expect(answer.cards[0]).toMatchObject({
      address: "Calle Sucre",
      localityName: "Guaranda",
    });
    expect(findPublishedByCode).not.toHaveBeenCalled();
  });

  it("keeps absent public addresses and unmatched locality names null", async () => {
    const answer = await enrichAgentCenterLocations(
      response,
      {
        findPublishedByCode: async () => ({ ...detail, address: null }),
        getDiscoveryCatalog: async () => ({ ...catalog, cantons: [] }),
      },
      new Map([[center.code, center]]),
    );
    expect(answer.cards[0]).toEqual({
      ...response.cards[0],
      address: null,
      localityName: null,
    });
  });

  it.each(["detail", "catalog"] as const)(
    "degrades a failed %s independently without losing travel times",
    async (failed) => {
      const answer = await enrichAgentCenterLocations(
        response,
        {
          findPublishedByCode: async () => {
            if (failed === "detail") throw new Error("Detail unavailable");
            return detail;
          },
          getDiscoveryCatalog: async () => {
            if (failed === "catalog") throw new Error("Catalog unavailable");
            return catalog;
          },
        },
        new Map([[center.code, center]]),
      );
      expect(answer.cards[0]).toEqual({
        ...response.cards[0],
        address: failed === "detail" ? null : "Calle Sucre",
        localityName: failed === "catalog" ? null : "Guaranda",
      });
    },
  );

  it("does not use an address returned for a different center", async () => {
    const answer = await enrichAgentCenterLocations(
      response,
      {
        findPublishedByCode: async () => ({ ...detail, code: "GUA-002" }),
        getDiscoveryCatalog: async () => catalog,
      },
      new Map([[center.code, center]]),
    );
    expect(answer.cards[0]).toMatchObject({
      address: null,
      localityName: "Guaranda",
    });
  });

  it("skips public lookups when no center was selected", async () => {
    const findPublishedByCode = vi.fn();
    const getDiscoveryCatalog = vi.fn();
    const withoutCenters = { ...response, cards: [response.cards[1]!] };
    expect(
      await enrichAgentCenterLocations(
        withoutCenters,
        { findPublishedByCode, getDiscoveryCatalog },
        new Map(),
      ),
    ).toBe(withoutCenters);
    expect(findPublishedByCode).not.toHaveBeenCalled();
    expect(getDiscoveryCatalog).not.toHaveBeenCalled();
  });
});
