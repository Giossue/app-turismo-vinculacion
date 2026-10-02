import { describe, expect, it, vi } from "vitest";

import {
  getOfflineCities,
  getOfflineCityManifest,
  parseStoredOfflineManifest,
} from "./offline-api";

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

  it("keeps the estimated-duration flag in a valid route manifest", async () => {
    const manifest = {
      city,
      package: city.package,
      boundary: null,
      centers: [],
      routes: [
        {
          key: "guaranda-centro-mirador",
          name: "Ruta turística",
          origin: "Guaranda",
          destination: "Mirador",
          durationMinutes: 24,
          durationEstimated: true,
          geometry: {
            type: "LineString",
            coordinates: [
              [-79.001, -1.593],
              [-79.002, -1.594],
            ],
          },
          directions: [],
        },
      ],
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: manifest }),
    });

    await expect(
      getOfflineCityManifest("guaranda", fetcher, "http://api.test/api/v1"),
    ).resolves.toMatchObject({ routes: [{ durationEstimated: true }] });
  });

  it("opens older downloaded cities with empty POI and establishment lists", () => {
    expect(
      parseStoredOfflineManifest(
        JSON.stringify({
          city,
          package: city.package,
          boundary: null,
          centers: [],
          routes: [],
        }),
      ),
    ).toMatchObject({ establishments: [], pois: [] });
  });

  it("validates POI coordinates and city bounds before storing", () => {
    const manifest = {
      city,
      package: city.package,
      boundary: null,
      centers: [],
      routes: [],
      establishments: [
        {
          name: "Hotel",
          category: null,
          categoryLabel: "Hotel",
          latitude: -1.59,
          longitude: -79,
          approximate: false,
          icon: "hotel",
          group: "lodging",
          activity: "Alojamiento",
          classification: null,
          address: "Centro",
          phone: null,
          localityName: "Guaranda",
        },
      ],
      pois: [
        {
          key: "point",
          name: "Plaza",
          description: null,
          category: null,
          latitude: -1.59,
          longitude: -79,
          icon: "map-marker",
        },
      ],
      bounds: [-79.12, -1.71, -78.88, -1.47],
    };
    expect(parseStoredOfflineManifest(JSON.stringify(manifest))).toEqual(
      manifest,
    );
    expect(
      parseStoredOfflineManifest(
        JSON.stringify({ ...manifest, bounds: [-79, -1.5, -79.2, -1.6] }),
      ),
    ).toBeNull();
    expect(
      parseStoredOfflineManifest(
        JSON.stringify({
          ...manifest,
          pois: [{ ...manifest.pois[0], latitude: 100 }],
        }),
      ),
    ).toBeNull();
  });

  it("rejects corrupt stored styles", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [{ id: "bg", type: "background" }],
    };
    const manifest = {
      city,
      package: city.package,
      boundary: null,
      centers: [],
      routes: [],
      download: {
        savedAt: "2026-10-02T10:00:00.000Z",
        packId: "pack",
        resourceSizeBytes: null,
        bounds: [-79.12, -1.71, -78.88, -1.47],
        mapStyles: { light: style, dark: style },
      },
    };
    expect(parseStoredOfflineManifest(JSON.stringify(manifest))).not.toBeNull();
    expect(
      parseStoredOfflineManifest(
        JSON.stringify({
          ...manifest,
          download: {
            ...manifest.download,
            mapStyles: { light: { version: 8 }, dark: style },
          },
        }),
      ),
    ).toBeNull();
  });
});
