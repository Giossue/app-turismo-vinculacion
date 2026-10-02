import { describe, expect, it, vi } from "vitest";

import { SearchService } from "../src/search/search.service";

function service(
  centers: object[] = [],
  establishments: object[] = [],
  places: object[] = [],
) {
  const query = vi.fn(async (sql: string) =>
    sql.includes("FROM centros_turisticos") ? centers : establishments,
  );
  const photonSearch = vi.fn().mockResolvedValue(places);
  return {
    search: new SearchService(
      { query } as never,
      { search: photonSearch } as never,
    ),
    query,
    photonSearch,
  };
}

const center = {
  title: "Café mirador",
  code: "020101AN010101001",
  latitude: -1.6,
  longitude: -79,
  subtitle: "Mirador",
  relevance: 500,
};
const establishment = {
  title: "Café",
  latitude: -1.601,
  longitude: -79,
  subtitle: "Cafetería",
  relevance: 600,
  approximate: false,
  icon: "cafe",
  color: "#123456",
  id: 123,
  ruc: "private",
};
const place = {
  title: "Café",
  latitude: -1.7,
  longitude: -79,
  subtitle: "Ecuador",
  type: "street",
  osm_id: 987,
};

describe("SearchService", () => {
  it("mixes sources by relevance before proximity and exposes no private identifiers", async () => {
    const { search } = service([center], [establishment], [place]);
    const result = await search.search({
      q: "cafe",
      latitude: -1.6,
      longitude: -79,
    });
    expect(result.items.map((item) => item.kind)).toEqual([
      "establishment",
      "geographic",
      "center",
    ]);
    expect(result.items[0].distanceMeters).toBeGreaterThan(0);
    expect(result.items[0]).not.toHaveProperty("id");
    expect(result.items[0]).not.toHaveProperty("ruc");
    expect(result.items[1]).not.toHaveProperty("osm_id");
    expect(result.items[0].relevance).toBe(600);
  });

  it("sorts equally relevant candidates across sources by distance", async () => {
    const { search } = service(
      [{ ...center, title: "Café", relevance: 600, latitude: -1.8 }],
      [establishment],
      [place],
    );
    expect(
      (
        await search.search({ q: "cafe", latitude: -1.6, longitude: -79 })
      ).items.map((item) => item.kind),
    ).toEqual(["establishment", "geographic", "center"]);
  });

  it("preserves relevance from description or taxonomy above a fuzzy title", async () => {
    const descriptionMatch = {
      ...center,
      title: "Mirador del río",
      relevance: 200,
    };
    const fuzzyTitle = { ...establishment, title: "Caffa", relevance: 140 };
    const { search } = service([descriptionMatch], [fuzzyTitle]);
    const result = await search.search({
      q: "cafe",
      latitude: -1.601,
      longitude: -79,
    });
    expect(result.items.map((item) => [item.title, item.relevance])).toEqual([
      ["Mirador del río", 200],
      ["Caffa", 140],
    ]);
  });

  it.each(["center", "establishment", "geographic"] as const)(
    "queries only the requested kind %s",
    async (kind) => {
      const { search, query, photonSearch } = service(
        [center],
        [establishment],
        [place],
      );
      const result = await search.search({ q: "Café", kind });
      expect(result.items.every((item) => item.kind === kind)).toBe(true);
      expect(result.items.every((item) => item.distanceMeters === null)).toBe(
        true,
      );
      expect(query).toHaveBeenCalledTimes(kind === "geographic" ? 0 : 1);
      expect(photonSearch).toHaveBeenCalledTimes(kind === "geographic" ? 1 : 0);
    },
  );

  it("filters every source by the requested viewport", async () => {
    const { search, query, photonSearch } = service(
      [center],
      [establishment],
      [place],
    );
    const bounds = { west: -79.1, south: -1.61, east: -78.9, north: -1.59 };
    const result = await search.search({ q: "Café", ...bounds });
    expect(result.items.map((item) => item.kind)).toEqual([
      "establishment",
      "center",
    ]);
    expect(photonSearch).toHaveBeenCalledWith("Café", { q: "Café", ...bounds });
    expect(query.mock.calls[0][0]).toContain(
      "BETWEEN $5::double precision AND $7::double precision",
    );
  });

  it("deduplicates repeated places and caps the complete list at 24", async () => {
    const establishments = Array.from({ length: 30 }, (_, index) => ({
      ...establishment,
      title: `Hotel ${index}`,
    }));
    const { search } = service([], establishments, [
      { ...place, title: "Hotel 0", latitude: establishment.latitude },
    ]);
    const result = await search.search({ q: "hotel" });
    expect(result.items).toHaveLength(24);
    expect(
      result.items.filter((item) => item.title === "Hotel 0"),
    ).toHaveLength(1);
  });

  it("keeps internal matches when there are no geographic matches", async () => {
    expect(
      (await service([center]).search.search({ q: "Café" })).items,
    ).toHaveLength(1);
  });

  it("does not broaden a punctuation-only query into all published records", async () => {
    const { search, query, photonSearch } = service([center]);
    expect((await search.search({ q: "%%" })).items).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    expect(photonSearch).not.toHaveBeenCalled();
  });
});
