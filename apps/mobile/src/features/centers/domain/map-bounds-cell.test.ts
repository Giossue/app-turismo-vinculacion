import { describe, expect, it } from "vitest";

import { quantizeMapBounds } from "./map-bounds-cell";

describe("quantizeMapBounds", () => {
  it("expands the box outward to the enclosing grid", () => {
    expect(
      quantizeMapBounds({
        west: -79.0123,
        south: -1.6187,
        east: -78.9811,
        north: -1.5802,
      }),
    ).toEqual({ west: -79.015, south: -1.62, east: -78.98, north: -1.58 });
  });

  it("gives nearby viewports the same key and keeps the box inside WGS84", () => {
    const first = quantizeMapBounds({
      west: -79.0121,
      south: -1.6181,
      east: -78.9812,
      north: -1.5803,
    });
    const nudged = quantizeMapBounds({
      west: -79.0129,
      south: -1.6189,
      east: -78.9802,
      north: -1.5801,
    });
    expect(nudged).toEqual(first);
    expect(
      quantizeMapBounds({ west: -180, south: -90, east: 180, north: 90 }),
    ).toEqual({ west: -180, south: -90, east: 180, north: 90 });
  });

  it("supports a custom cell size", () => {
    expect(
      quantizeMapBounds(
        { west: -79.013, south: -1.617, east: -78.982, north: -1.581 },
        0.01,
      ),
    ).toEqual({ west: -79.02, south: -1.62, east: -78.98, north: -1.58 });
  });
});
