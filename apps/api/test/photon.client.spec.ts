import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { PhotonClient } from "../src/search/infrastructure/photon.client";

describe("PhotonClient", () => {
  it("limits forward searches to Ecuador and normalizes places", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: "Guaranda",
              state: "Bolívar",
              country: "Ecuador",
              type: "city",
            },
            geometry: { coordinates: [-79.0016, -1.5923] },
          },
        ],
      }),
    });
    const client = new PhotonClient(
      new ConfigService({
        GEOCODING_PHOTON_URL: "http://photon-ecuador:2322",
        GEOCODING_REQUEST_TIMEOUT_MS: 3_000,
      }),
      fetcher,
    );

    await expect(client.search("Guaranda")).resolves.toEqual([
      {
        title: "Guaranda",
        subtitle: "Bolívar, Ecuador",
        latitude: -1.5923,
        longitude: -79.0016,
        type: "city",
      },
    ]);

    const [url] = fetcher.mock.calls[0] as [URL];
    expect(url.searchParams.get("countrycode")).toBe("EC");
    expect(url.searchParams.get("lang")).toBe("default");
  });

  it("degrades to no geographic results when Photon is unavailable", async () => {
    const client = new PhotonClient(
      new ConfigService({
        GEOCODING_PHOTON_URL: "http://photon-ecuador:2322",
        GEOCODING_REQUEST_TIMEOUT_MS: 3_000,
      }),
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    await expect(client.search("Guaranda")).resolves.toEqual([]);
  });
});
