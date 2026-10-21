import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { NearbyController } from "../src/nearby/nearby.controller";
import { nearbyQuerySchema } from "../src/nearby/nearby.query";
import { NearbyService } from "../src/nearby/nearby.service";

const center = {
  code: "C-1",
  name: "Cascada",
  description: null,
  latitude: -1.6,
  longitude: -79,
  category: "Atractivos naturales",
  type: "Ríos",
  subtype: "Cascada",
  hierarchy: null,
  categoryCode: "AN",
  typeCode: "R",
  subtypeCode: "C",
  provinceCode: "02",
  cantonCode: "0201",
  parishCode: "020150",
  hierarchyCode: null,
  distanceMeters: 800,
};

const establishment = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  nombreComercial: "Café Central",
  actividad: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
  clasificacion: "CAFETERÍA",
  categoria: null,
  categoriaEtiqueta: null,
  direccion: null,
  telefono: null,
  latitude: -1.59,
  longitude: -79.01,
  distanceMeters: 300,
  localityName: "Guaranda",
  ...overrides,
});

function createService() {
  const listNearbyPublished = vi.fn().mockResolvedValue({ items: [center] });
  const nearbyPublicPlaces = vi
    .fn()
    .mockResolvedValue([
      establishment(),
      establishment({ id: 8, latitude: null, distanceMeters: null }),
    ]);
  const service = new NearbyService({ listNearbyPublished }, {
    nearbyPublicPlaces,
  } as never);
  return { listNearbyPublished, nearbyPublicPlaces, service };
}

const point = nearbyQuerySchema.parse({ latitude: "-1.6", longitude: "-79" });

describe("nearbyQuerySchema", () => {
  it("applies bounded defaults", () => {
    expect(point).toEqual({
      latitude: -1.6,
      longitude: -79,
      radiusMeters: 5000,
      filter: "all",
      limit: 20,
    });
  });

  it.each([
    { longitude: "-79" },
    { latitude: "-91", longitude: "-79" },
    { latitude: "-1.6", longitude: "-79", radiusMeters: "50000" },
    { latitude: "-1.6", longitude: "-79", limit: "500" },
    { latitude: "-1.6", longitude: "-79", filter: "bars" },
  ])("rejects %o", (query) => {
    expect(nearbyQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("NearbyService", () => {
  it("merges centers and establishments by distance", async () => {
    const { service } = createService();

    await expect(service.list(point)).resolves.toEqual([
      {
        kind: "establishment",
        id: 7,
        activity: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
        title: "Café Central",
        subtitle: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO · Guaranda",
        latitude: -1.59,
        longitude: -79.01,
        distanceMeters: 300,
      },
      {
        kind: "center",
        code: "C-1",
        title: "Cascada",
        subtitle: "Atractivos naturales · Ríos",
        latitude: -1.6,
        longitude: -79,
        distanceMeters: 800,
      },
    ]);
  });

  it("only queries centers for attractions", async () => {
    const { nearbyPublicPlaces, service } = createService();

    const items = await service.list({ ...point, filter: "attractions" });

    expect(items.map((item) => item.kind)).toEqual(["center"]);
    expect(nearbyPublicPlaces).not.toHaveBeenCalled();
  });

  it("maps food to the establishment activity and skips centers", async () => {
    const { listNearbyPublished, nearbyPublicPlaces, service } =
      createService();

    await service.list({ ...point, filter: "food", limit: 5 });

    expect(listNearbyPublished).not.toHaveBeenCalled();
    expect(nearbyPublicPlaces).toHaveBeenCalledWith({
      latitude: -1.6,
      longitude: -79,
      radiusMeters: 5000,
      limit: 5,
      category: "ALIMENTOS",
    });
  });

  it("respects the limit after merging", async () => {
    const { service } = createService();

    const items = await service.list({ ...point, limit: 1 });

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("establishment");
  });
});

describe("NearbyController", () => {
  it("returns the public envelope", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const controller = new NearbyController({ list } as never);

    await expect(
      controller.list({ latitude: "-1.6", longitude: "-79", filter: "food" }),
    ).resolves.toEqual({ data: { items: [] } });
    expect(list).toHaveBeenCalledWith({ ...point, filter: "food" });
  });

  it("rejects a missing location", async () => {
    const controller = new NearbyController({ list: vi.fn() } as never);

    await expect(controller.list({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
