import { describe, expect, it } from "vitest";

import { listCentersQuerySchema } from "../src/centers/presentation/centers.query";

describe("listCentersQuerySchema", () => {
  it("accepts the public discovery filters", () => {
    const result = listCentersQuerySchema.parse({
      q: "Mirador",
      categoryCode: "AN",
      typeCode: "01",
      subtypeCode: "01",
      provinceCode: "02",
      cantonCode: "02",
      parishCode: "01",
      hierarchyCode: "03",
      west: "-79.1",
      south: "-1.7",
      east: "-78.9",
      north: "-1.5",
    });

    expect(result).toMatchObject({
      q: "Mirador",
      categoryCode: "AN",
      limit: 50,
    });
  });

  it("rejects a partial viewport", () => {
    expect(() => listCentersQuerySchema.parse({ west: -79 })).toThrow(
      "viewport requiere",
    );
  });

  it("requires at least two characters for a text search", () => {
    expect(() => listCentersQuerySchema.parse({ q: "a" })).toThrow();
  });
});
