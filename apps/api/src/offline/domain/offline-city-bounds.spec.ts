import { describe, expect, it } from "vitest";

import { getOfflineCityBounds } from "./offline-city-bounds";
import { OfflineCityAreaUnavailableError } from "./offline-city";

describe("offline city coverage", () => {
  it("uses every component of the official multipolygon before the city center", () => {
    expect(
      getOfflineCityBounds(
        {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-79.02, -1.61],
                [-79, -1.59],
                [-79.02, -1.61],
              ],
            ],
            [
              [
                [-78.98, -1.57],
                [-78.97, -1.56],
                [-78.98, -1.57],
              ],
            ],
          ],
        },
        { latitude: null, longitude: null },
      ),
    ).toEqual([-79.02, -1.61, -78.97, -1.56]);
  });

  it("uses the bounded city-centered fallback when no official boundary exists", () => {
    const bounds = getOfflineCityBounds(null, {
      latitude: -1.6,
      longitude: -79,
    });
    expect(bounds[0]).toBeCloseTo(-79.12);
    expect(bounds[1]).toBeCloseTo(-1.72);
    expect(bounds[2]).toBeCloseTo(-78.88);
    expect(bounds[3]).toBeCloseTo(-1.48);
  });

  it("does not silently use Guaranda for a city without geographic information", () => {
    expect(() =>
      getOfflineCityBounds(null, { latitude: null, longitude: null }),
    ).toThrow(OfflineCityAreaUnavailableError);
    expect(() =>
      getOfflineCityBounds(null, { latitude: NaN, longitude: -79 }),
    ).toThrow(OfflineCityAreaUnavailableError);
  });

  it("handles a detailed boundary without spreading coordinates on the call stack", () => {
    const ring = Array.from({ length: 150_000 }, (_, index) => [
      -79 + (index % 2) * 0.02,
      -1.6 + (index % 3) * 0.02,
    ]);
    expect(
      getOfflineCityBounds(
        { type: "Polygon", coordinates: [ring] },
        { latitude: null, longitude: null },
      ),
    ).toEqual([-79, -1.6, -78.98, -1.56]);
  });
});
