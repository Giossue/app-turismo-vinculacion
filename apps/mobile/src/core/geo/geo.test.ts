import { describe, expect, it } from "vitest";

import { getCoordinateBounds } from "./bounds";
import {
  getDistanceMeters,
  normalizeLongitude,
  offsetCoordinate,
  toRadians,
} from "./distance";

describe("getDistanceMeters", () => {
  it("calculates geographic distance in meters", () => {
    const distance = getDistanceMeters(
      { latitude: -1.59, longitude: -79 },
      { latitude: -1.59, longitude: -79.001 },
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(115);
  });

  it("returns zero for the same point", () => {
    const point = { latitude: -1.59263, longitude: -79.00098 };
    expect(getDistanceMeters(point, point)).toBe(0);
  });

  it("stays finite for antipodal points", () => {
    const distance = getDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeCloseTo(Math.PI * 6_371_000, 0);
  });
});

describe("offsetCoordinate", () => {
  it("moves a point the requested distance along the bearing", () => {
    const origin = { latitude: -1.59, longitude: -79 };
    const moved = offsetCoordinate(origin, 30, 90);

    expect(getDistanceMeters(origin, moved)).toBeCloseTo(30, 3);
    expect(moved.longitude).toBeGreaterThan(origin.longitude);
    expect(moved.latitude).toBeCloseTo(origin.latitude, 6);
  });

  it("wraps longitudes across the antimeridian", () => {
    expect(normalizeLongitude(181)).toBeCloseTo(-179);
    expect(normalizeLongitude(-181)).toBeCloseTo(179);
    expect(toRadians(180)).toBeCloseTo(Math.PI);
  });
});

describe("getCoordinateBounds", () => {
  it("returns null without coordinates", () => {
    expect(getCoordinateBounds([])).toBeNull();
  });

  it("returns the west, south, east, north box", () => {
    expect(
      getCoordinateBounds([
        [-79.001, -1.593],
        [-79, -1.594],
        [-79.002, -1.59],
      ]),
    ).toEqual([-79.002, -1.594, -79, -1.59]);
  });

  it("handles geometries larger than the argument spread limit", () => {
    const coordinates = Array.from(
      { length: 200_000 },
      (_, index) => [index - 100_000, 50_000 - index] as const,
    );
    expect(getCoordinateBounds(coordinates)).toEqual([
      -100_000, -149_999, 99_999, 50_000,
    ]);
  });
});
