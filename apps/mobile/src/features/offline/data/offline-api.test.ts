import { describe, expect, it, vi } from "vitest";

import { getOfflineCities, getOfflineCityManifest } from "./offline-api";

const city = {
  slug: "bolivar-guaranda-guaranda",
  name: "Guaranda",
  canton: "Guaranda",
  province: "Bolívar",
  latitude: -1.59263,
  longitude: -79.00098,
  package: {
    version: 1,
    checksumSha256: null,
    zoomMin: 8,
    zoomMax: 17,
    publishedAt: "2026-09-17T00:00:00.000Z",
  },
};

describe("offline public API", () => {
  it("validates the city catalog", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [city] }),
    });

    await expect(
      getOfflineCities(fetcher, "http://api.test/api/v1"),
    ).resolves.toEqual([city]);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/offline/cities",
      { headers: { Accept: "application/json" } },
    );
  });

  it("rejects a malformed city manifest", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { city } }),
    });

    await expect(
      getOfflineCityManifest("guaranda", fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("manifiesto offline");
  });
});
