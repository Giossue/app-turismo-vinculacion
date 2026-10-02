import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import {
  PhotonClient,
  type PhotonPlace,
  selectPreferredPlaces,
} from "../src/search/infrastructure/photon.client";

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

  it("sends the focus and bbox and rejects places outside the requested coverage", async () => {
    const feature = (
      longitude: number,
      latitude: number,
      countrycode = "EC",
    ) => ({
      properties: { name: "Lugar", countrycode, osm_id: 10 },
      geometry: { coordinates: [longitude, latitude] },
    });
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          feature(-79, -1.6),
          feature(-78, -1.6),
          feature(-79, -1.6, "PE"),
          feature(181, -1.6),
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
    const results = await client.search("Lugar", {
      latitude: -1.6,
      longitude: -79,
      west: -79.1,
      south: -1.7,
      east: -78.9,
      north: -1.5,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).not.toHaveProperty("osm_id");
    const [url] = fetcher.mock.calls[0] as [URL];
    expect(url.searchParams.get("bbox")).toBe("-79.1,-1.7,-78.9,-1.5");
    expect(url.searchParams.get("lat")).toBe("-1.6");
    expect(url.searchParams.get("lon")).toBe("-79");
  });

  it("aborts the provider request on timeout and degrades safely", async () => {
    const fetcher = vi.fn(
      (_url: URL, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    );
    const client = new PhotonClient(
      new ConfigService({
        GEOCODING_PHOTON_URL: "http://photon-ecuador:2322",
        GEOCODING_REQUEST_TIMEOUT_MS: 5,
      }),
      fetcher as never,
    );
    await expect(client.search("Guaranda")).resolves.toEqual([]);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("keeps the most relevant exact geographic match", () => {
    const city = {
      title: "Guaranda",
      subtitle: "Guaranda, Bolívar, Ecuador",
      latitude: -1.5095,
      longitude: -79.0244,
      type: "city",
    } satisfies PhotonPlace;
    const county = {
      ...city,
      subtitle: "Provincia de Bolívar, Ecuador",
      type: "county",
    } satisfies PhotonPlace;
    const street = {
      ...city,
      subtitle: "Cuenca, Azuay, Ecuador",
      type: "street",
    } satisfies PhotonPlace;

    expect(selectPreferredPlaces("Guaranda", [county, street, city])).toEqual([
      city,
    ]);
  });
});
