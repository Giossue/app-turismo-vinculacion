import { describe, expect, it, vi } from "vitest";

import { getPublishedCenters } from "./public-centers-api";

describe("getPublishedCenters", () => {
  it("returns public data after validating its contract", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
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
          },
        ],
      }),
    });

    await expect(
      getPublishedCenters({}, fetcher, "http://api.test/api/v1"),
    ).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith("http://api.test/api/v1/centers", {
      headers: { Accept: "application/json" },
    });
  });

  it("rejects an invalid response without rendering it", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: [{}] }) });

    await expect(
      getPublishedCenters({}, fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("formato esperado");
  });
});
