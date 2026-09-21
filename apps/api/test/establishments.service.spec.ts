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
  it("returns active map markers with category visuals and precision", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        name: "Hotel de prueba",
        category: "2 Estrellas",
        latitude: "-1.59263",
        longitude: "-79.00098",
        approximate: true,
        icon: "hotel",
        color: "#7c3aed",
      },
    ]);
    const service = new EstablishmentsService({ query } as never);

    await expect(service.map({ limit: 500 })).resolves.toEqual({
      items: [
        {
          name: "Hotel de prueba",
          category: "2 Estrellas",
          latitude: -1.59263,
          longitude: -79.00098,
          approximate: true,
          icon: "hotel",
          color: "#7c3aed",
        },
      ],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("e.activo = TRUE"),
      [500],
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "e.coordenadas_aproximadas AS approximate",
    );
  });

  it("rejects an incomplete map viewport", async () => {
    const service = new EstablishmentsService({ query: vi.fn() } as never);

    await expect(service.map({ west: -79, limit: 500 })).rejects.toThrow(
      "cuatro límites",
    );
  });

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

  it("requires both coordinates before opening a create transaction", async () => {
    const transaction = vi.fn();
    const service = new EstablishmentsService({ transaction } as never);

    await expect(
      service.create(4, {
        localityId: 1,
        nombreComercial: "Comedor de prueba",
        actividad: "Alimentación",
      }),
    ).rejects.toThrow("latitud y la longitud son obligatorias");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("audits a new establishment in the same transaction", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "9" }])
      .mockResolvedValueOnce([{ ...row, id: "9" }])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const transaction = vi.fn(
      async (callback: (value: typeof manager) => unknown) => callback(manager),
    );
    const service = new EstablishmentsService({ transaction } as never);

    await service.create(7, {
      localityId: 1,
      numeroRegistro: "CAT-9",
      nombreComercial: "Nuevo comedor",
      actividad: "Alimentación",
      latitude: -1.59,
      longitude: -79.01,
    });

    expect(managerQuery).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      expect.arrayContaining([7, 9, "CREAR"]),
    );
  });

  it("resolves the dependent establishment taxonomy before inserting", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "10", name: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO" },
      ])
      .mockResolvedValueOnce([
        { id: "11", activityId: "10", name: "CAFETERÍA" },
      ])
      .mockResolvedValueOnce([
        {
          id: "12",
          classificationId: "11",
          activityId: "10",
          categoryName: "2 Tazas",
          classificationName: "CAFETERÍA",
          activityName: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
        },
      ])
      .mockResolvedValueOnce([{ id: "13" }])
      .mockResolvedValueOnce([
        {
          ...row,
          id: "13",
          activityId: "10",
          classificationId: "11",
          categoryId: "12",
          actividad: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
          clasificacion: "CAFETERÍA",
          categoria: "2 Tazas",
        },
      ])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const transaction = vi.fn(
      async (callback: (value: typeof manager) => unknown) => callback(manager),
    );
    const service = new EstablishmentsService({ transaction } as never);

    await service.create(7, {
      localityId: 1,
      numeroRegistro: "CAT-13",
      nombreComercial: "Cafetería catalogada",
      actividad: "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
      activityId: 10,
      classificationId: 11,
      categoryId: 12,
      latitude: -1.59,
      longitude: -79.01,
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO establecimientos_turisticos"),
      expect.arrayContaining([
        "ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO",
        "CAFETERÍA",
        "2 Tazas",
        10,
        11,
        12,
      ]),
    );
  });

  it("audits activation changes and locks the establishment first", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...row, active: false }])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const transaction = vi.fn(
      async (callback: (value: typeof manager) => unknown) => callback(manager),
    );
    const service = new EstablishmentsService({ transaction } as never);

    await service.setActive("8", 7, false);

    expect(managerQuery.mock.calls[0]?.[0]).toContain("FOR UPDATE OF e");
    expect(managerQuery).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      expect.arrayContaining([7, 8, "DESACTIVAR"]),
    );
  });

  it("reads only establishment audit entries for an administrator", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        action: "MODIFICAR",
        previous: { nombreComercial: "Antes" },
        next: { nombreComercial: "Después" },
        createdAt: "2026-09-20T00:00:00.000Z",
        actor: "Admin",
      },
    ]);
    const service = new EstablishmentsService({ query } as never);

    await expect(service.getAudit("8")).resolves.toEqual({
      items: [
        {
          action: "MODIFICAR",
          previous: { nombreComercial: "Antes" },
          next: { nombreComercial: "Después" },
          createdAt: "2026-09-20T00:00:00.000Z",
          actor: "Admin",
        },
      ],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("a.catalogo_codigo = 'ESTABLISHMENT'"),
      [8],
    );
  });
});
