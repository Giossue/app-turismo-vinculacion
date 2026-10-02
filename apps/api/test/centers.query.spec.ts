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
      offset: 0,
    });
  });

  it("accepts a subsequent viewport page with up to 100 centers", () => {
    expect(
      listCentersQuerySchema.parse({ limit: "100", offset: "100" }),
    ).toMatchObject({ limit: 100, offset: 100 });
  });

  it.each([-1, 1.5, "invalid", Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid pagination offset: %s",
    (offset) => {
      expect(() => listCentersQuerySchema.parse({ offset })).toThrow();
    },
  );

  it.each([0, 101])("rejects an out-of-range page size: %s", (limit) => {
    expect(() => listCentersQuerySchema.parse({ limit })).toThrow();
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
