import { describe, expect, it, vi } from "vitest";

import { EstablishmentsService } from "../src/establishments/establishments.service";

const locality = {
  id: "1",
  name: "Guaranda",
  type: "CIUDAD",
  cantonName: "Guaranda",
  provinceName: "Bolívar",
};

const row = {
  id: "8",
  localityId: "1",
  localityName: "Guaranda",
  localityType: "CIUDAD",
  cantonName: "Guaranda",
  provinceName: "Bolívar",
  numeroRegistro: "CAT-8",
  ruc: "0999999999001",
  nombreComercial: "Comedor de prueba",
  razonSocial: "Comedor de prueba S.A.S.",
  actividad: "Alimentación",
  clasificacion: "Restaurante",
  categoria: "Tercera",
  direccion: "Calle principal",
  telefono: "032999999",
  latitude: "-1.59",
  longitude: "-79.01",
  active: true,
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
  distanceMeters: "120.4",
};

describe("EstablishmentsService", () => {
  it("rejects a public search without an activity or location", async () => {
    const service = new EstablishmentsService({ query: vi.fn() } as never);

    await expect(service.nearby({ limit: 20 })).rejects.toThrow(
      "Indica la actividad",
    );
  });

  it("returns direct locality results without exposing fiscal identifiers", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([locality])
      .mockResolvedValueOnce([row]);
    const service = new EstablishmentsService({ query } as never);

    await expect(
      service.nearby({
        activity: "Alimentación",
        localityId: 1,
        latitude: -1.59,
        longitude: -79.01,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [
        {
          nombreComercial: "Comedor de prueba",
          actividad: "Alimentación",
          clasificacion: "Restaurante",
          categoria: "Tercera",
          direccion: "Calle principal",
          telefono: "032999999",
          latitude: -1.59,
          longitude: -79.01,
          distanceMeters: 120.4,
          localityName: "Guaranda",
        },
      ],
      fallbackApplied: false,
      requestedLocalityName: "Guaranda",
      effectiveLocality: {
        name: "Guaranda",
        type: "CIUDAD",
        cantonName: "Guaranda",
        provinceName: "Bolívar",
        distanceMeters: null,
      },
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toContain("e.localidad_id = $1");
    expect(query.mock.calls[1]?.[0]).toContain("e.actividad");
  });

  it("falls back to the nearest locality when the requested one has no matching record", async () => {
    const fallback = { ...locality, id: "2", name: "San José" };
    const query = vi
      .fn()
      .mockResolvedValueOnce([locality])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([fallback])
      .mockResolvedValueOnce([row]);
    const service = new EstablishmentsService({ query } as never);

    const result = await service.nearby({
      activity: "Alimentación",
      localityId: 1,
      latitude: -1.59,
      longitude: -79.01,
      limit: 20,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.requestedLocalityName).toBe("Guaranda");
    expect(result.effectiveLocality?.name).toBe("San José");
    expect(query.mock.calls[2]?.[0]).toContain("l.id <> $1");
  });

  it("requires the minimum fields before opening a create transaction", async () => {
    const transaction = vi.fn();
    const service = new EstablishmentsService({ transaction } as never);

    await expect(
      service.create(4, { actividad: "Alimentación" }),
    ).rejects.toThrow("localidad, el nombre comercial y la actividad");
    expect(transaction).not.toHaveBeenCalled();
  });
});
