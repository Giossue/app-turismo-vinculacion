import { describe, expect, it } from "vitest";

import {
  getEstablishmentTilesUrl,
  parseEstablishmentTileFeature,
} from "./establishment-tiles";

describe("getEstablishmentTilesUrl", () => {
  it("returns the XYZ template MapLibre fills in", () => {
    expect(getEstablishmentTilesUrl("http://api.test/api/v1")).toBe(
      "http://api.test/api/v1/establishments/tiles/{z}/{x}/{y}",
    );
  });
});

describe("parseEstablishmentTileFeature", () => {
  it("rebuilds the establishment of a tapped detail feature", () => {
    expect(
      parseEstablishmentTileFeature({
        name: "Hotel Guaranda",
        category: "2 Estrellas",
        categoryLabel: "Hotel · 2 Estrellas",
        latitude: -1.59263,
        longitude: -79.00098,
        approximate: true,
        icon: "accommodation-hotel",
        group: "lodging",
      }),
    ).toEqual({
      name: "Hotel Guaranda",
      category: "2 Estrellas",
      categoryLabel: "Hotel · 2 Estrellas",
      latitude: -1.59263,
      longitude: -79.00098,
      approximate: true,
      icon: "accommodation-hotel",
    });
  });

  it("fills the label with the category when the tile omits it", () => {
    expect(
      parseEstablishmentTileFeature({
        name: "Bar",
        category: "Única",
        latitude: -1.5,
        longitude: -79,
        approximate: false,
        icon: "eat-drink-cafe",
      }),
    ).toMatchObject({ category: "Única", categoryLabel: "Única" });
  });

  it("ignores aggregated cells and other sources", () => {
    expect(
      parseEstablishmentTileFeature({ count: 12, icon: "accommodation-hotel" }),
    ).toBeNull();
    expect(parseEstablishmentTileFeature({ code: "C-1" })).toBeNull();
    expect(parseEstablishmentTileFeature(null)).toBeNull();
  });
});
