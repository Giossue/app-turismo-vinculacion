import { describe, expect, it, vi } from "vitest";

import { getEstablishmentKey } from "../domain/establishment";
import {
  getNearbyEstablishments,
  getPublishedEstablishment,
} from "./establishments-api";

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

describe("getPublishedEstablishment", () => {
  it("loads the public record with its photos", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 42,
          nombreComercial: "Hotel Guaranda",
          actividad: "Alojamiento",
          clasificacion: "Hotel",
          categoria: null,
          categoriaEtiqueta: null,
          direccion: "Calle 10 de Agosto",
          telefono: null,
          latitude: -1.59,
          longitude: -79.0,
          distanceMeters: null,
          localityName: "Guaranda",
          photos: [
            {
              id: 3,
              url: "/api/v1/media/establishments/3",
              description: "Fachada",
            },
          ],
        },
      }),
    });

    await expect(
      getPublishedEstablishment(42, {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).resolves.toMatchObject({
      id: 42,
      photos: [{ id: 3, url: "/api/v1/media/establishments/3" }],
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/establishments/42",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });
});

describe("getEstablishmentKey", () => {
  const place = { name: "Bar", latitude: -1.5, longitude: -79 };

  it("prefers the registry id", () => {
    expect(getEstablishmentKey({ ...place, id: 42 })).toBe("id:42");
  });

  it("falls back to name and coordinates without an id", () => {
    expect(getEstablishmentKey(place)).toBe("Bar:-1.5:-79");
  });
});
