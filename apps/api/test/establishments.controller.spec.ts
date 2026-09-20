import { describe, expect, it, vi } from "vitest";

import { AdminEstablishmentsController } from "../src/establishments/establishments.controller";

describe("AdminEstablishmentsController audit", () => {
  it("delegates the establishment audit history by id", async () => {
    const getAudit = vi.fn().mockResolvedValue({ items: [] });
    const controller = new AdminEstablishmentsController({ getAudit } as never);

    await expect(controller.audit("8")).resolves.toEqual({
      data: { items: [] },
    });
    expect(getAudit).toHaveBeenCalledWith("8");
  });
});
