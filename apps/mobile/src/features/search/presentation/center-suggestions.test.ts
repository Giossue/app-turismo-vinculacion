import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import { getCenterSuggestions } from "./center-suggestions";

function center(code: string, name: string, type = "Montaña"): PublicCenter {
  return {
    code,
    name,
    description: null,
    latitude: -1.59,
    longitude: -79,
    category: "Atractivos naturales",
    type,
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

describe("getCenterSuggestions", () => {
  const centers = [
    center("1", "Cruz Loma"),
    center("2", "Museo de Guaranda", "Museo"),
    center("3", "Chimborazo"),
  ];

  it("matches name, category, type or subtype ignoring case", () => {
    expect(getCenterSuggestions(centers, "  MUSEO ").map((c) => c.code)).toEqual(
      ["2"],
    );
    expect(getCenterSuggestions(centers, "colina")).toHaveLength(3);
  });

  it("returns nothing for blank text and caps the list", () => {
    expect(getCenterSuggestions(centers, "   ")).toEqual([]);
    expect(getCenterSuggestions(centers, "a", 2)).toHaveLength(2);
  });
});
