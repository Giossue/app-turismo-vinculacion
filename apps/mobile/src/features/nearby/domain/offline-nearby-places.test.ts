import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import { buildOfflineNearbyPlaces } from "./offline-nearby-places";

const origin = { latitude: -1.6, longitude: -79 };

const center = {
  code: "C1",
  name: "Mirador",
  category: "Naturales",
  type: "Montañas",
  latitude: -1.601,
  longitude: -79,
} as PublicCenter;

const establishment = (
  id: number | undefined,
  activity: string,
  far = false,
) => ({
  id,
  name: `Lugar ${id}`,
  category: null,
  categoryLabel: "Comida",
  latitude: far ? -1.9 : -1.6005,
  longitude: -79,
  approximate: false,
  icon: "eat-drink-restaurant",
  group: null,
  activity,
  classification: null,
  address: null,
  phone: null,
  localityName: "Centro",
});

const manifest = {
  centers: [center],
  establishments: [
    establishment(1, "ALIMENTOS"),
    establishment(2, "ALOJAMIENTO"),
    establishment(3, "ALIMENTOS", true),
    establishment(undefined, "ALIMENTOS"),
  ],
} as unknown as OfflineCityManifest;

const query = { ...origin, filter: "all" as const };

describe("lugares cercanos desde las descargas", () => {
  it("ordena por distancia y deja fuera lo que supera el radio", () => {
    const places = buildOfflineNearbyPlaces([manifest], query);
    expect(places.map((place) => place.title)).toEqual([
      "Lugar 1",
      "Lugar 2",
      "Mirador",
    ]);
  });

  it("usa los mismos subtítulos que la API", () => {
    const places = buildOfflineNearbyPlaces([manifest], query);
    expect(places[0].subtitle).toBe("Comida · Centro");
    expect(places[2].subtitle).toBe("Naturales · Montañas");
  });

  it.each([
    ["attractions", ["Mirador"]],
    ["food", ["Lugar 1"]],
    ["lodging", ["Lugar 2"]],
  ] as const)("aplica el filtro %s", (filter, titles) => {
    const places = buildOfflineNearbyPlaces([manifest], { ...origin, filter });
    expect(places.map((place) => place.title)).toEqual(titles);
  });

  it("desempata por nombre, como la API", () => {
    const tied = {
      centers: [],
      establishments: [
        { ...establishment(1, "ALIMENTOS"), name: "Zeta" },
        { ...establishment(2, "ALIMENTOS"), name: "Árbol" },
        { ...establishment(3, "ALIMENTOS"), name: "Beta" },
      ],
    } as unknown as OfflineCityManifest;
    expect(
      buildOfflineNearbyPlaces([tied], query).map((place) => place.title),
    ).toEqual(["Árbol", "Beta", "Zeta"]);
  });

  it("busca el tipo en nombre, actividad, clasificación y categoría", () => {
    const base = establishment(1, "TURISMO");
    const manifest = {
      centers: [],
      establishments: [
        { ...base, id: 1, name: "Alimentos Don Juan" },
        { ...base, id: 2, name: "B", classification: "alimentos y bebidas" },
        { ...base, id: 3, name: "C", category: "ALIMENTOS" },
        { ...base, id: 4, name: "D" },
      ],
    } as unknown as OfflineCityManifest;
    expect(
      buildOfflineNearbyPlaces([manifest], { ...origin, filter: "food" }).map(
        (place) => place.title,
      ),
    ).toEqual(["Alimentos Don Juan", "B", "C"]);
  });

  it("no repite lugares presentes en dos ciudades", () => {
    expect(buildOfflineNearbyPlaces([manifest, manifest], query)).toHaveLength(
      3,
    );
  });

  it("respeta el límite pedido", () => {
    expect(
      buildOfflineNearbyPlaces([manifest], { ...query, limit: 1 }),
    ).toHaveLength(1);
  });
});
