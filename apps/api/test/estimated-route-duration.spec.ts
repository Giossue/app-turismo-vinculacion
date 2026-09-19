import { describe, expect, it } from "vitest";

import { estimateRouteDurationMinutes } from "../src/transport/domain/estimated-route-duration";

describe("estimateRouteDurationMinutes", () => {
  it("uses the average speed for a bus", () => {
    expect(estimateRouteDurationMinutes(10_000, "bus")).toBe(24);
  });

  it("normalizes transport codes with accents and spaces", () => {
    expect(estimateRouteDurationMinutes(5_000, "a pie")).toBe(60);
  });

  it("returns null for an unusable geometry length", () => {
    expect(estimateRouteDurationMinutes(null, "bus")).toBeNull();
    expect(estimateRouteDurationMinutes(0, "bus")).toBeNull();
  });
});
