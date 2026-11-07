import { describe, expect, it, vi } from "vitest";

import type { OfflineCityManifest } from "../domain/offline-city";
import { getStoredOfflineEstablishment } from "./offline-fallback";

const storage = vi.hoisted(() => ({
  listStoredOfflineCenterRecords: vi.fn(),
  listStoredOfflineManifests: vi.fn(),
}));
vi.mock("../data/offline-storage", () => storage);

const manifest = {
  establishments: [
    {
      id: 7,
      name: "Hostal Andino",
      category: "hotel",
      categoryLabel: "Hostal",
      latitude: -1.6,
      longitude: -79,
      approximate: false,
      icon: "accommodation-hotel",
      group: "lodging",
      activity: "ALOJAMIENTO",
      classification: "HOSTAL",
      address: "Calle Sucre",
      phone: "032980000",
      localityName: "Guaranda",
    },
  ],
} as unknown as OfflineCityManifest;

describe("establecimiento desde las descargas", () => {
  it("devuelve la ficha con los datos guardados y sin fotos", async () => {
    storage.listStoredOfflineManifests.mockResolvedValueOnce([manifest]);
    await expect(getStoredOfflineEstablishment(7)).resolves.toEqual({
      id: 7,
      nombreComercial: "Hostal Andino",
      actividad: "ALOJAMIENTO",
      clasificacion: "HOSTAL",
      categoria: "hotel",
      categoriaEtiqueta: "Hostal",
      direccion: "Calle Sucre",
      telefono: "032980000",
      latitude: -1.6,
      longitude: -79,
      distanceMeters: null,
      localityName: "Guaranda",
      photos: [],
    });
  });

  it("no inventa una ficha si el id no está descargado", async () => {
    storage.listStoredOfflineManifests.mockResolvedValueOnce([manifest]);
    await expect(getStoredOfflineEstablishment(8)).resolves.toBeNull();
  });
});
