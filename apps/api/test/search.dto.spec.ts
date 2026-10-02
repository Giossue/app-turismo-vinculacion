import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { PublicSearchQueryDto } from "../src/search/search.dto";

async function errors(query: Record<string, unknown>) {
  return validate(plainToInstance(PublicSearchQueryDto, query));
}

describe("public search query", () => {
  it("preserves the original query and accepts a valid focus and viewport", async () => {
    const query = plainToInstance(PublicSearchQueryDto, {
      q: "  Café  ",
      kind: "establishment",
      latitude: "-1.6",
      longitude: "-79",
      west: "-79.2",
      south: "-1.8",
      east: "-78.8",
      north: "-1.4",
    });
    expect(query.q).toBe("Café");
    expect(query.latitude).toBe(-1.6);
    expect(await validate(query)).toEqual([]);
    expect(await errors({ q: "Guaranda" })).toEqual([]);
  });

  it.each(["center", "establishment", "geographic"])(
    "accepts kind %s",
    async (kind) => {
      expect(await errors({ q: "Museos", kind })).toEqual([]);
    },
  );

  it.each([
    { q: "a" },
    { q: "  " },
    { q: "a".repeat(121) },
    { q: "Café", kind: "users" },
    { q: "Café", latitude: "-1" },
    { q: "Café", longitude: "-79" },
    { q: "Café", latitude: "", longitude: "0" },
    { q: "Café", latitude: ["0"], longitude: "0" },
    { q: "Café", latitude: "NaN", longitude: "0" },
    { q: "Café", latitude: "91", longitude: "0" },
    { q: "Café", latitude: "0", longitude: "181" },
  ])("rejects an invalid query or incomplete focus %j", async (query) => {
    expect((await errors(query)).length).toBeGreaterThan(0);
  });

  it.each(["west", "south", "east", "north"])(
    "requires the complete bbox when %s is omitted",
    async (field) => {
      const query: Record<string, unknown> = {
        q: "Museo",
        west: -80,
        south: -2,
        east: -78,
        north: 0,
      };
      delete query[field];
      expect((await errors(query)).length).toBeGreaterThan(0);
    },
  );

  it.each([
    { west: -78, south: -2, east: -80, north: 0 },
    { west: -80, south: 0, east: -78, north: -2 },
    { west: -80, south: -2, east: -80, north: 0 },
    { west: -181, south: -2, east: -78, north: 0 },
    { west: -80, south: -91, east: -78, north: 0 },
    { west: -80, south: -2, east: "", north: 0 },
    { west: -80, south: -2, east: -78, north: Infinity },
  ])(
    "rejects unordered, degenerate or out-of-range bounds %j",
    async (bounds) => {
      expect((await errors({ q: "Museo", ...bounds })).length).toBeGreaterThan(
        0,
      );
    },
  );
});
