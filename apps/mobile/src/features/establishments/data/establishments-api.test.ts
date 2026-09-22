import { describe, expect, it, vi } from "vitest";

import {
  getMapEstablishments,
  getNearbyEstablishments,
} from "./establishments-api";

describe("getMapEstablishments", () => {
  it("loads category visuals for public map markers", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              name: "Hotel Guaranda",
              category: "2 Estrellas",
              latitude: -1.59,
              longitude: -79.01,
              approximate: true,
              icon: "accommodation-hotel",
              color: "#7a5c3e",
            },
          ],
        },
      }),
    });

    await expect(
      getMapEstablishments(null, {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).resolves.toEqual({
      items: [
        {
          name: "Hotel Guaranda",
          category: "2 Estrellas",
          latitude: -1.59,
          longitude: -79.01,
          approximate: true,
          icon: "accommodation-hotel",
          color: "#7a5c3e",
        },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/establishments/map",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("keeps the map usable when the public marker route is not deployed yet", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(
      getMapEstablishments(null, {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).resolves.toEqual({ items: [] });
  });
});

describe("getNearbyEstablishments", () => {
  it("sends the activity and point without exposing internal identifiers", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              nombreComercial: "Comedor Guaranda",
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
        },
      }),
    });

    await expect(
      getNearbyEstablishments(
        { activity: "Alimentación", latitude: -1.59, longitude: -79.01 },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).resolves.toMatchObject({
      items: [{ nombreComercial: "Comedor Guaranda" }],
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/establishments/nearby?activity=Alimentaci%C3%B3n&latitude=-1.59&longitude=-79.01",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("keeps fallback metadata so the UI can explain the nearest city", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [],
          fallbackApplied: true,
          requestedLocalityName: "San Simón",
          effectiveLocality: {
            name: "Guaranda",
            type: "CIUDAD",
            cantonName: "Guaranda",
            provinceName: "Bolívar",
            distanceMeters: 8600,
          },
        },
      }),
    });

    await expect(
      getNearbyEstablishments(
        { activity: "Alimentación", localityId: 4 },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).resolves.toMatchObject({
      fallbackApplied: true,
      requestedLocalityName: "San Simón",
      effectiveLocality: { name: "Guaranda", distanceMeters: 8600 },
    });
  });
});
