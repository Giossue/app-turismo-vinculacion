import { describe, expect, it } from "vitest";

import {
  getNextOpinionOffset,
  getOpinionKey,
  mergeOpinionPages,
  type PublicOpinion,
  type PublicOpinionPage,
} from "./opinion";

const summary = {
  total: 3,
  totalRatings: 3,
  averageRating: 4.3,
  distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 2 },
};

function opinion(authorName: string, publishedAt: string): PublicOpinion {
  return { authorName, comment: null, publishedAt, rating: 5 };
}

function page(
  items: readonly PublicOpinion[],
  offset: number,
  total = 3,
): PublicOpinionPage {
  return { items: [...items], limit: 2, offset, summary, total };
}

const ana = opinion("Ana", "2026-09-20T12:00:00.000Z");
const luis = opinion("Luis", "2026-09-19T12:00:00.000Z");
const eva = opinion("Eva", "2026-09-18T12:00:00.000Z");

describe("opinion pages", () => {
  it("asks for the next offset until every opinion is loaded", () => {
    expect(getNextOpinionOffset(page([ana, luis], 0))).toBe(2);
    expect(getNextOpinionOffset(page([eva], 2))).toBeUndefined();
    // An empty page ends the list even if the total changed meanwhile.
    expect(getNextOpinionOffset(page([], 2, 5))).toBeUndefined();
  });

  it("merges pages without repeating shifted opinions", () => {
    const merged = mergeOpinionPages([
      page([ana, luis], 0),
      // A new opinion moved Luis to the second page.
      page([luis, eva], 2),
    ]);
    expect(merged.items).toEqual([ana, luis, eva]);
    expect(merged.summary).toBe(summary);
    expect(merged.offset).toBe(0);
  });

  it("builds keys that survive reordering", () => {
    expect(getOpinionKey(ana)).toBe("2026-09-20T12:00:00.000Z|Ana");
    expect(getOpinionKey(ana)).not.toBe(
      getOpinionKey(opinion("Ana", luis.publishedAt)),
    );
  });
});
