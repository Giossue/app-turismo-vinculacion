import { describe, expect, it } from "vitest";

import { searchScore } from "../src/search/search-ranking";

describe("searchScore", () => {
  it("lets a close partial match beat a far prefix match", () => {
    expect(searchScore(400, 500)).toBeGreaterThan(searchScore(500, 200_000));
  });

  it("keeps an exact name above any nearby partial match", () => {
    expect(searchScore(600, 300_000)).toBeGreaterThan(searchScore(500, 0));
  });

  it("does not let distance rescue a weak description match", () => {
    expect(searchScore(200, 0)).toBeLessThan(searchScore(400, 300_000));
  });

  it("uses text relevance alone without a location", () => {
    expect(searchScore(400, null)).toBe(400);
  });
});
