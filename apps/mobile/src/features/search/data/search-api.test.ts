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
        fetcher,
        "http://api.test/api/v1",
      ),
    ).resolves.toMatchObject({ photonAvailable: true });

    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/search?q=Guaranda&latitude=-1.59&longitude=-79",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });
});
