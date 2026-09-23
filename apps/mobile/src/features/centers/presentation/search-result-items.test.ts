import { describe, expect, it } from "vitest";

import type { PublicSearchResult } from "@/features/search/domain/search-result";
import type { PublicCenter } from "../domain/public-center";
import { buildSearchResultItems } from "./search-result-items";

function center(code: string, latitude: number): PublicCenter {
  return {
    code,
    name: `Centro ${code}`,
    description: null,
    latitude,
    longitude: -79,
    category: "Atractivos naturales",
    type: "Montaña",
    subtype: "Colina",
    hierarchy: null,
    categoryCode: "NAT",
    typeCode: "MON",
    subtypeCode: "COL",
    provinceCode: "02",
    cantonCode: "0201",
    parishCode: "020101",
    hierarchyCode: null,
  };
}

function place(
  kind: PublicSearchResult["kind"],
  title: string,
  centerCode?: string,
): PublicSearchResult {
  return {
    kind,
    source: "internal",
    title,
    subtitle: "Bolívar",
    latitude: -1.6,
    longitude: -79,
    centerCode,
  };
}

const origin = { latitude: -1.5, longitude: -79 };
const far = center("FAR", -1.8);
const near = center("NEAR", -1.51);

describe("buildSearchResultItems", () => {
  it("keeps the API order and computes each distance once", () => {
    const items = buildSearchResultItems({
      centers: [far, near],
      origin,
      places: [],
      sortByDistance: false,
    });

    expect(items.map((item) => item.key)).toEqual([
      "center:FAR",
      "center:NEAR",
    ]);
    const [first] = items;
    expect(first.kind === "center" && first.distanceMeters).toBeGreaterThan(
      30_000,
    );
  });

  it("sorts centers by distance only with a location", () => {
    const sorted = buildSearchResultItems({
      centers: [far, near],
      origin,
      places: [],
      sortByDistance: true,
    });
    const withoutLocation = buildSearchResultItems({
      centers: [far, near],
      origin: null,
      places: [],
      sortByDistance: true,
    });

    expect(sorted.map((item) => item.key)).toEqual([
      "center:NEAR",
      "center:FAR",
    ]);
    expect(withoutLocation.map((item) => item.key)).toEqual([
      "center:FAR",
      "center:NEAR",
    ]);
    expect(
      withoutLocation.every(
        (item) => item.kind === "center" && item.distanceMeters === null,
      ),
    ).toBe(true);
  });

  it("appends only the places that are not listed centers", () => {
    const items = buildSearchResultItems({
      centers: [near],
      origin: null,
      places: [
        place("center", "Centro NEAR", "NEAR"),
        place("center", "Otro centro", "OTHER"),
        place("establishment", "Hotel"),
        place("geographic", "Guaranda"),
      ],
      sortByDistance: false,
    });

    expect(
      items.map((item) =>
        item.kind === "center" ? item.center.code : item.place.title,
      ),
    ).toEqual(["NEAR", "Otro centro", "Hotel", "Guaranda"]);
  });
});
