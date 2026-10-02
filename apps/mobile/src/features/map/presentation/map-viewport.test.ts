import { describe, expect, it } from "vitest";

import { isSameMapViewport, parseMapViewport } from "./map-viewport";

const center = [-79.00098, -1.59263];
const bounds = [-79.02, -1.61, -78.98, -1.58];

describe("parseMapViewport", () => {
  it("uses MapLibre v11 longitude/latitude and flat bbox ordering", () => {
    expect(parseMapViewport(center, bounds)).toEqual({
      center: { latitude: -1.59263, longitude: -79.00098 },
      bounds: [-79.02, -1.61, -78.98, -1.58],
    });
  });

  it.each([
    [null, bounds],
    [[-79], bounds],
    [[-79, -1, 14], bounds],
    [["-79", -1], bounds],
    [[Number.NaN, -1], bounds],
    [[-79, Number.POSITIVE_INFINITY], bounds],
    [[181, -1], bounds],
    [[-79, -91], bounds],
    [
      center,
      [
        [-79.02, -1.61],
        [-78.98, -1.58],
      ],
    ],
    [center, [-79.02, -1.61, -78.98]],
    [center, [-79.02, -1.61, -78.98, Number.NaN]],
    [center, [-181, -1.61, -78.98, -1.58]],
    [center, [-79.02, -1.61, 181, -1.58]],
    [center, [-79.02, -91, -78.98, -1.58]],
    [center, [-79.02, -1.61, -78.98, 91]],
    [center, [-78.98, -1.61, -79.02, -1.58]],
    [center, [-79.02, -1.58, -78.98, -1.61]],
    [center, [-79.02, -1.61, -79.02, -1.58]],
    [center, [-79.02, -1.61, -78.98, -1.61]],
  ])("rejects an invalid center or viewport: %j, %j", (point, area) => {
    expect(parseMapViewport(point, area)).toBeNull();
  });
});

describe("isSameMapViewport", () => {
  const viewport = {
    center: { longitude: -79.00098, latitude: -1.59263 },
    bounds: [-79.02, -1.61, -78.98, -1.58] as [number, number, number, number],
  };

  it("requires an initial publication and ignores duplicate rounding noise", () => {
    expect(isSameMapViewport(null, viewport)).toBe(false);
    expect(
      isSameMapViewport(viewport, {
        center: {
          ...viewport.center,
          longitude: viewport.center.longitude + 0.00000001,
        },
        bounds: [...viewport.bounds],
      }),
    ).toBe(true);
  });

  it("detects zoom changes even when the center remains still", () => {
    expect(
      isSameMapViewport(viewport, {
        ...viewport,
        bounds: [-79.01, -1.605, -78.99, -1.59],
      }),
    ).toBe(false);
  });

  it("detects camera center changes inside the same bounds", () => {
    expect(
      isSameMapViewport(viewport, {
        ...viewport,
        center: { ...viewport.center, latitude: -1.595 },
      }),
    ).toBe(false);
  });
});
