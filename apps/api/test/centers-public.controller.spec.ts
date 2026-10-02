import { describe, expect, it, vi } from "vitest";

import { CentersPublicController } from "../src/centers/presentation/centers-public.controller";

describe("CentersPublicController pagination", () => {
  it("returns the full total and default first page for existing clients", async () => {
    const execute = vi.fn().mockResolvedValue({ items: [], total: 153 });
    const controller = new CentersPublicController(
      { execute } as never,
      {} as never,
      {} as never,
    );

    await expect(controller.list({})).resolves.toEqual({
      data: [],
      meta: { total: 153, limit: 50, offset: 0 },
    });
    expect(execute).toHaveBeenCalledWith({
      text: undefined,
      bounds: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it("passes the viewport and filters with a subsequent page", async () => {
    const items = [{ code: "public-center", name: "Mirador" }];
    const execute = vi.fn().mockResolvedValue({ items, total: 153 });
    const controller = new CentersPublicController(
      { execute } as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.list({
        west: "-79.1",
        south: "-1.7",
        east: "-78.9",
        north: "-1.5",
        categoryCode: "AN",
        limit: "100",
        offset: "100",
      }),
    ).resolves.toEqual({
      data: items,
      meta: { total: 153, limit: 100, offset: 100 },
    });
    expect(execute).toHaveBeenCalledWith({
      text: undefined,
      bounds: { west: -79.1, south: -1.7, east: -78.9, north: -1.5 },
      categoryCode: "AN",
      limit: 100,
      offset: 100,
    });
  });

  it.each([{ offset: "-1" }, { limit: "101" }, { west: "-79" }])(
    "rejects invalid pagination or a partial viewport before querying: %j",
    async (query) => {
      const execute = vi.fn();
      const controller = new CentersPublicController(
        { execute } as never,
        {} as never,
        {} as never,
      );

      await expect(controller.list(query)).rejects.toMatchObject({
        status: 400,
      });
      expect(execute).not.toHaveBeenCalled();
    },
  );
});
