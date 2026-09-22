import { describe, expect, it, vi } from "vitest";

import { SearchController } from "../src/search/search.controller";

describe("SearchController", () => {
  it("returns the public search envelope", async () => {
    const result = {
      items: [],
      meta: { photonAvailable: false },
    };
    const search = vi.fn().mockResolvedValue(result);
    const controller = new SearchController({ search } as never);

    await expect(controller.query({ q: "Guaranda" })).resolves.toEqual({
      data: result,
    });
    expect(search).toHaveBeenCalledWith({ q: "Guaranda" });
  });
});
