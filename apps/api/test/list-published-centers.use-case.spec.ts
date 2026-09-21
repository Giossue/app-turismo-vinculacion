import { describe, expect, it, vi } from "vitest";

import { ListPublishedCentersUseCase } from "../src/centers/application/list-published-centers.use-case";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";

describe("ListPublishedCentersUseCase", () => {
  it("delegates a bounded public query to the repository", async () => {
    const listPublished = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const repository: PublicCenterRepository = {
      listPublished,
      listNearbyPublished: vi.fn(),
      findPublishedByCode: vi.fn(),
      getDiscoveryCatalog: vi.fn(),
    };
    const useCase = new ListPublishedCentersUseCase(repository);
    const query = {
      text: "Guaranda",
      bounds: { west: -79.1, south: -1.7, east: -78.9, north: -1.5 },
      limit: 25,
    };

    await expect(useCase.execute(query)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(listPublished).toHaveBeenCalledWith(query);
  });
});
