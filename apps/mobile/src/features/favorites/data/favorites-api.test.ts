import { describe, expect, it, vi } from "vitest";

import {
  listRemoteSavedCenters,
  listRemoteSavedEstablishments,
  removeRemoteCenter,
  removeRemoteEstablishment,
  saveRemoteEstablishment,
} from "./favorites-api";

const center = {
  code: "020201AN010103001",
  name: "Mirador turístico de Guaranda",
  description: null,
  latitude: -1.59263,
  longitude: -79.00098,
  category: "Atractivos naturales",
  type: "Sitios naturales",
  subtype: "Miradores",
  hierarchy: "III",
  categoryCode: "AN",
  typeCode: "01",
  subtypeCode: "01",
  provinceCode: "02",
  cantonCode: "02",
  parishCode: "01",
  hierarchyCode: "03",
};

describe("favorites API", () => {
  it("validates the remote saved-center catalog", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [center] }),
    });

    await expect(
      listRemoteSavedCenters(request, "http://api.test/api/v1"),
    ).resolves.toEqual([center]);
    expect(request).toHaveBeenCalledWith(
      "http://api.test/api/v1/favorites/centers",
    );
  });

  it("uses DELETE for removing a saved center", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      removeRemoteCenter(center.code, request, "http://api.test/api/v1"),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith(
      `http://api.test/api/v1/favorites/centers/${center.code}`,
      { method: "DELETE" },
    );
  });

  it("validates saved establishments and their endpoints", async () => {
    const establishment = {
      id: 7,
      nombreComercial: "Hotel Guaranda",
      actividad: "Alojamiento",
      clasificacion: "Hotel",
      categoria: null,
      categoriaEtiqueta: null,
      direccion: null,
      telefono: null,
      latitude: -1.59,
      longitude: -79.0,
      distanceMeters: null,
      localityName: "Guaranda",
      photoUrl: "/api/v1/media/establishments/3",
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [establishment] }),
    });
    await expect(
      listRemoteSavedEstablishments(request, "http://api.test/api/v1"),
    ).resolves.toEqual([establishment]);
    expect(request).toHaveBeenCalledWith(
      "http://api.test/api/v1/favorites/establishments",
    );

    const save = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: establishment }),
    });
    await expect(
      saveRemoteEstablishment(7, save, "http://api.test/api/v1"),
    ).resolves.toEqual(establishment);
    expect(save).toHaveBeenCalledWith(
      "http://api.test/api/v1/favorites/establishments/7",
      { method: "PUT" },
    );

    const remove = vi.fn().mockResolvedValue({ ok: true });
    await removeRemoteEstablishment(7, remove, "http://api.test/api/v1");
    expect(remove).toHaveBeenCalledWith(
      "http://api.test/api/v1/favorites/establishments/7",
      { method: "DELETE" },
    );
  });
});
