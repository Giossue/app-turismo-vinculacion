import { describe, expect, it } from "vitest";
import {
  getSearchRelevance,
  normalizeSearchText,
  rankSearchSuggestions,
} from "./search-relevance";
import {
  isValidSearchBounds,
  type SearchSuggestionItem,
} from "./search-suggestion";

const suggestion = (
  key: string,
  title: string,
  distanceMeters: number | null,
  subtitle = "",
): SearchSuggestionItem => ({
  key,
  title,
  distanceMeters,
  subtitle,
  kind: "center",
});

describe("search relevance", () => {
  it("ignores accents, case and punctuation", () => {
    expect(normalizeSearchText("  CAFÉ · Bolívar ")).toBe("cafe bolivar");
    expect(getSearchRelevance("Cafeteria", "Cafetería", "")).toBe(600);
  });
  it("accepts category synonyms and plurals", () => {
    expect(
      getSearchRelevance("cafes", "Art Late", "Cafetería"),
    ).toBeGreaterThan(0);
    expect(
      getSearchRelevance("hoteles", "Los Pinos", "Alojamiento"),
    ).toBeGreaterThan(0);
    expect(
      getSearchRelevance("cascadas", "Chorro Blanco", "Cascada"),
    ).toBeGreaterThan(0);
    expect(getSearchRelevance("hoteles", "Los Pinos", "Hostería")).toBe(200);
    expect(
      getSearchRelevance("comer", "Los Pinos", "Alimentos y bebidas"),
    ).toBe(200);
  });
  it("accepts one character typo/transposition but keeps short words strict", () => {
    expect(getSearchRelevance("cafetertia", "Cafetería", "")).toBeGreaterThan(
      0,
    );
    expect(getSearchRelevance("cafetaria", "Cafetería", "")).toBeGreaterThan(0);
    expect(getSearchRelevance("cafetreia", "Cafetería", "")).toBeGreaterThan(0);
    expect(getSearchRelevance("cafx", "Café", "")).toBe(0);
    expect(getSearchRelevance("hotel inexistente", "Hotel Central", "")).toBe(
      0,
    );
  });
  it("ranks exact names before a nearer category match, then distance across kinds", () => {
    const items = [
      suggestion("near", "Art Late", 2, "Cafetería"),
      suggestion("exact", "Cafetería", 500),
      {
        ...suggestion("middle", "Otro", 20, "Cafetería"),
        kind: "establishment" as const,
      },
      suggestion("unknown", "Sin distancia", null, "Cafetería"),
    ];
    expect(
      rankSearchSuggestions(items, "cafeteria").map((item) => item.key),
    ).toEqual(["exact", "near", "middle", "unknown"]);
  });
  it("rejects invalid viewports and accepts WGS84 bounding boxes", () => {
    expect(isValidSearchBounds([-79.02, -1.62, -78.98, -1.58])).toBe(true);
    expect(isValidSearchBounds([-78, -1.62, -79, -1.58])).toBe(false);
    expect(isValidSearchBounds([-79, NaN, -78, -1])).toBe(false);
    expect(isValidSearchBounds([-181, -1, -78, 1])).toBe(false);
    expect(isValidSearchBounds([-79, -1, -79, 1])).toBe(false);
    expect(isValidSearchBounds([-79, -1, -78, -1])).toBe(false);
  });
});
