import { describe, expect, it } from "vitest";

import {
  isReliableLocationAccuracy,
  maximumAcceptedLocationAccuracyMeters,
} from "./location-quality";

describe("isReliableLocationAccuracy", () => {
  it("accepts a finite accuracy inside the supported radius", () => {
    expect(isReliableLocationAccuracy(0)).toBe(true);
    expect(
      isReliableLocationAccuracy(maximumAcceptedLocationAccuracyMeters),
    ).toBe(true);
  });

  it("rejects missing, invalid, negative and broad readings", () => {
    expect(isReliableLocationAccuracy(null)).toBe(false);
    expect(isReliableLocationAccuracy(undefined)).toBe(false);
    expect(isReliableLocationAccuracy(Number.NaN)).toBe(false);
    expect(isReliableLocationAccuracy(-1)).toBe(false);
    expect(
      isReliableLocationAccuracy(maximumAcceptedLocationAccuracyMeters + 1),
    ).toBe(false);
  });
});
