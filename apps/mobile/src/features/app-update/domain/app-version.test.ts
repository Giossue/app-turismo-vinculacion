import { describe, expect, it } from "vitest";

import { compareVersions, shouldOfferUpdate } from "./app-version";

describe("app version", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("1.0.10", "1.0.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.3", "1.0.3")).toBe(0);
    expect(compareVersions("1.0.3", "1.1.0")).toBeLessThan(0);
  });

  it("offers only a newer version that was not dismissed", () => {
    expect(shouldOfferUpdate("1.0.3", "1.0.4", null)).toBe(true);
    expect(shouldOfferUpdate("1.0.3", "1.0.3", null)).toBe(false);
    expect(shouldOfferUpdate("1.0.4", "1.0.3", null)).toBe(false);
    expect(shouldOfferUpdate("1.0.3", "1.0.4", "1.0.4")).toBe(false);
    expect(shouldOfferUpdate("1.0.3", "1.0.5", "1.0.4")).toBe(true);
  });
});
