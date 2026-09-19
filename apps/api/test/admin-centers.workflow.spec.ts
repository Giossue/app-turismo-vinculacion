import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

const center = {
  id: "10",
  code: "020201AN010103001",
  name: "Centro de prueba",
  statusCode: "EN_REVISION",
  statusName: "En revisión",
  active: true,
  publishedAt: null,
  subtypeId: 1,
  touristZoneId: 1,
  parishId: 1,
  productLineId: 1,
  scenarioId: 1,
  hierarchyId: 1,
  latitude: "-1.59",
  longitude: "-79.01",
  altitudeMeters: null,
  description: null,
  barrio: null,
  street: null,
  addressNumber: null,
  crossStreet: null,
  administration: null,
  climate: null,
  admission: null,
};

function serviceWithManager(query: ReturnType<typeof vi.fn>) {
  const manager = { query };
  return new AdminCentersService({
    transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  } as never);
}

describe("AdminCentersService workflow boundaries", () => {
  it("does not approve a center when there is no pending revision", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([center])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = serviceWithManager(query);

    await expect(
      service.review(center.code, 99, { action: "APPROVE" }),
    ).rejects.toThrow("ya no está en revisión");
  });

  it("does not publish a draft that has not been approved", async () => {
    const draft = {
      id: "8",
      stateCode: "BORRADOR",
      stateName: "Borrador",
      version: 2,
      data: {},
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce([center])
      .mockResolvedValueOnce([draft]);
    const service = serviceWithManager(query);

    await expect(service.publish(center.code, 99)).rejects.toThrow(
      "Solo se pueden publicar fichas aprobadas",
    );
  });

  it("rejects editing while a center is being reviewed", async () => {
    const draft = {
      id: "8",
      stateCode: "EN_REVISION",
      stateName: "En revisión",
      version: 2,
      data: {},
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce([center])
      .mockResolvedValueOnce([draft]);
    const service = serviceWithManager(query);

    await expect(
      service.save(center.code, 99, { name: "Cambio concurrente" }),
    ).rejects.toThrow("no se puede editar");
  });
});
