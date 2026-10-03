import { describe, expect, it } from "vitest";

import {
  savedEstablishmentToMap,
  toSavedEstablishment,
  toggleSavedEstablishment,
  type SavedEstablishment,
} from "./saved-establishment";

const hotel: SavedEstablishment = {
  id: 7,
  nombreComercial: "Hotel Guaranda",
  actividad: "Alojamiento",
  clasificacion: "Hotel",
  categoria: "2 Estrellas",
  categoriaEtiqueta: "Hotel · 2 Estrellas",
  direccion: "Calle 10 de Agosto",
  telefono: null,
  latitude: -1.59,
  longitude: -79.0,
  distanceMeters: null,
  localityName: "Guaranda",
  photoUrl: null,
};
const comedor: SavedEstablishment = {
  ...hotel,
  id: 8,
  nombreComercial: "Comedor",
};

describe("toggleSavedEstablishment", () => {
  it("adds a newly saved establishment first without duplicating it", () => {
    expect(toggleSavedEstablishment([comedor, hotel], hotel, false)).toEqual([
      hotel,
      comedor,
    ]);
  });

  it("removes an establishment that was saved", () => {
    expect(toggleSavedEstablishment([comedor, hotel], hotel, true)).toEqual([
      comedor,
    ]);
  });
});

describe("toSavedEstablishment", () => {
  const pin = {
    id: 7,
    name: "Hotel Guaranda",
    category: "2 Estrellas",
    categoryLabel: "Hotel · 2 Estrellas",
    latitude: -1.59,
    longitude: -79.0,
    approximate: false,
    icon: "accommodation-hotel",
  };

  it("prefers the loaded detail and keeps its first photo", () => {
    const { photoUrl: _photoUrl, ...publicHotel } = hotel;
    expect(
      toSavedEstablishment(pin, {
        ...publicHotel,
        photos: [
          { id: 3, url: "/api/v1/media/establishments/3", description: null },
        ],
      }),
    ).toEqual({ ...hotel, photoUrl: "/api/v1/media/establishments/3" });
  });

  it("falls back to the pin data", () => {
    expect(toSavedEstablishment(pin)).toMatchObject({
      id: 7,
      nombreComercial: "Hotel Guaranda",
      categoriaEtiqueta: "Hotel · 2 Estrellas",
      photoUrl: null,
    });
  });
});

describe("savedEstablishmentToMap", () => {
  it("rebuilds the map pin with its registry id", () => {
    expect(savedEstablishmentToMap(hotel, "default")).toEqual({
      id: 7,
      name: "Hotel Guaranda",
      category: "2 Estrellas",
      categoryLabel: "Hotel · 2 Estrellas",
      latitude: -1.59,
      longitude: -79.0,
      approximate: false,
      icon: "default",
    });
  });

  it("cannot place an establishment without coordinates", () => {
    expect(
      savedEstablishmentToMap({ ...hotel, latitude: null }, "default"),
    ).toBeNull();
  });
});
