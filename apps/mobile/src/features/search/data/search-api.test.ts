import { describe, expect, it, vi } from "vitest";

import { searchPublicPlaces } from "./search-api";

describe("searchPublicPlaces", () => {
  it("sends the search and optional location to the API", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              kind: "geographic",
              source: "photon",
              title: "Guaranda",
              subtitle: "Bolívar, Ecuador",
              latitude: -1.59,
              longitude: -79,
            },
          ],
          meta: { photonAvailable: true },
        },
      }),
    });

    await expect(
      searchPublicPlaces(
        "Guaranda",
        { latitude: -1.59, longitude: -79 },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).resolves.toMatchObject({ photonAvailable: true });

    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/search?q=Guaranda&latitude=-1.59&longitude=-79",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("sends kind and area bounding box without GPS and validates optional distance", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              kind: "establishment",
              source: "internal",
              title: "Café",
              subtitle: "Cafetería",
              latitude: -1.59,
              longitude: -79,
              distanceMeters: 0,
              relevance: 400,
            },
          ],
          meta: { photonAvailable: false },
        },
      }),
    });
    const result = await searchPublicPlaces("  cafe  ", null, {
      apiUrl: "http://api.test/api/v1",
      fetcher,
      kind: "establishment",
      bounds: [-79.02, -1.62, -78.98, -1.58],
    });
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "cafe",
      kind: "establishment",
      west: "-79.02",
      south: "-1.62",
      east: "-78.98",
      north: "-1.58",
    });
    expect(result.items[0]?.distanceMeters).toBe(0);
    expect(result.items[0]?.relevance).toBe(400);
  });

  it("passes cancellation through unchanged", async () => {
    const controller = new AbortController();
    const aborted = new DOMException("Stopped", "AbortError");
    const fetcher = vi.fn(
      (_url, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(aborted), {
            once: true,
          });
        }),
    );
    const request = searchPublicPlaces("cafe", null, {
      apiUrl: "http://api.test/api/v1",
      fetcher,
      signal: controller.signal,
    });
    controller.abort();
    await expect(request).rejects.toBe(aborted);
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
