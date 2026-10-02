import { describe, expect, it } from "vitest";
import type { OfflineCityManifest } from "./offline-city";
import { getOfflineCityBounds } from "./offline-city-bounds";

const manifest: OfflineCityManifest = {
  city: {
    slug: "riobamba",
    name: "Riobamba",
    canton: "Riobamba",
    province: "Chimborazo",
    longitude: -78.65,
    latitude: -1.67,
    package: null,
  },
  package: {
    version: 1,
    zoomMin: 8,
    zoomMax: 17,
    checksumSha256: null,
    publishedAt: null,
  },
  boundary: null,
  centers: [],
  establishments: [],
  pois: [],
  routes: [],
};
describe("offline city bounds", () => {
  it("prefers the published package extent", () => {
    expect(
      getOfflineCityBounds({ ...manifest, bounds: [-79, -2, -78, -1] }),
    ).toEqual([-79, -2, -78, -1]);
  });
  it("reads geometry only and ignores numeric feature properties", () => {
    expect(
      getOfflineCityBounds({
        ...manifest,
        boundary: {
          type: "Feature",
          properties: { numbers: [0, 0] },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-78.7, -1.7],
                [-78.6, -1.6],
                [-78.7, -1.7],
              ],
            ],
          },
        },
      }),
    ).toEqual([-78.7, -1.7, -78.6, -1.6]);
  });
  it("uses actual city coordinates for an older manifest", () => {
    const [west, south, east, north] = getOfflineCityBounds(manifest);
    expect(west).toBeCloseTo(-78.77);
    expect(east).toBeCloseTo(-78.53);
    expect(south).toBeCloseTo(-1.79);
    expect(north).toBeCloseTo(-1.55);
  });
  it("never substitutes Guaranda when coordinates are unavailable", () => {
    expect(() =>
      getOfflineCityBounds({
        ...manifest,
        city: { ...manifest.city, longitude: null, latitude: null },
      }),
    ).toThrow("límites");
  });
});
