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

  it("passes the agent scope to the private list", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new AdminEstablishmentsController({ list } as never);

    await controller.list({ limit: 25, offset: 0 }, {
      id: 12,
      roles: ["AGENTE_TURISTICO"],
    } as never);

    expect(list).toHaveBeenCalledWith({ limit: 25, offset: 0 }, 12, false);
  });

  it("delegates review decisions as an administrator", async () => {
    const review = vi.fn().mockResolvedValue({ id: 8 });
    const controller = new AdminEstablishmentsController({ review } as never);

    await expect(
      controller.review(
        "8",
        { action: "REJECT", observation: "Falta verificar la ubicación." },
        { id: 4, roles: ["ADMINISTRADOR"] } as never,
      ),
    ).resolves.toEqual({ data: { id: 8 } });
    expect(review).toHaveBeenCalledWith("8", 4, {
      action: "REJECT",
      observation: "Falta verificar la ubicación.",
    });
  });
});
