import { describe, expect, it, vi } from "vitest";

import { listRemoteSavedCenters, removeRemoteCenter } from "./favorites-api";

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
});
