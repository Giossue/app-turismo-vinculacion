import { describe, expect, it } from "vitest";

import {
  getBearingDifference,
  headingMinimumIntervalMs,
  normalizeBearing,
  shouldPublishHeading,
  smoothBearing,
} from "./navigation-heading";

describe("navigation heading", () => {
  it("normalizes any angle into [0, 360)", () => {
    expect(normalizeBearing(370)).toBe(10);
    expect(normalizeBearing(-10)).toBe(350);
    expect(normalizeBearing(360)).toBe(0);
  });

  it("measures the shortest arc between bearings", () => {
    expect(getBearingDifference(350, 10)).toBe(20);
    expect(getBearingDifference(10, 350)).toBe(20);
    expect(getBearingDifference(0, 180)).toBe(180);
  });

  it("smooths across north without spinning the long way", () => {
    expect(smoothBearing(350, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it("publishes the first reading right away", () => {
    expect(shouldPublishHeading(null, 90, 0)).toBe(true);
  });

  it("skips small rotations and bursts faster than ~5 Hz", () => {
    const previous = { at: 1_000, bearing: 90 };

    expect(
      shouldPublishHeading(previous, 91, 1_000 + headingMinimumIntervalMs),
    ).toBe(false);
    expect(shouldPublishHeading(previous, 120, 1_050)).toBe(false);
    expect(
      shouldPublishHeading(previous, 120, 1_000 + headingMinimumIntervalMs),
    ).toBe(true);
  });
});
