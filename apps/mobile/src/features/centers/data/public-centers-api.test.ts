import { describe, expect, it, vi } from "vitest";

import type { PublicCenter } from "../domain/public-center";
import {
  getPublishedCenters,
  getPublishedMapCenters,
} from "./public-centers-api";

describe("getPublishedCenters", () => {
  it("keeps the map empty when the remote catalog is empty", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await expect(
      getPublishedCenters({}, fetcher, "http://api.test/api/v1"),
    ).resolves.toEqual([]);
  });

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

  it("sends the submitted query through the public search endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await expect(
      getPublishedCenters(
        { text: "mirador" },
        fetcher,
        "http://api.test/api/v1",
      ),
    ).resolves.toHaveLength(0);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/centers?q=mirador",
      { headers: { Accept: "application/json" } },
    );
  });
});

const mapFilters = {
  bounds: { west: -79.02, south: -1.62, east: -78.98, north: -1.58 },
  categoryCode: "AN",
};

function mapCenter(index: number): PublicCenter {
  return {
    code: `ATTR-${index}`,
    name: `Atractivo ${index}`,
    description: null,
    latitude: -1.59,
    longitude: -79,
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
}

describe("getPublishedMapCenters", () => {
  it("loads every page of a visible area with more than 100 attractions", async () => {
    const data = Array.from({ length: 153 }, (_, index) => mapCenter(index));
    const fetcher = vi.fn(
      async (url: RequestInfo | URL, _init?: RequestInit) => {
        const offset = Number(new URL(String(url)).searchParams.get("offset"));
        return {
          ok: true,
          json: async () => ({
            data: data.slice(offset, offset + 100),
            meta: { total: data.length, limit: 100, offset },
          }),
        } as Response;
      },
    );
    const signal = new AbortController().signal;
    await expect(
      getPublishedMapCenters(mapFilters, {
        fetcher,
        signal,
        apiUrl: "http://api.test/api/v1",
      }),
    ).resolves.toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [index, [url, init]] of fetcher.mock.calls.entries()) {
      const query = new URL(String(url)).searchParams;
      expect(query.get("offset")).toBe(String(index * 100));
      expect(query.get("limit")).toBe("100");
      expect(query.get("west")).toBe("-79.02");
      expect(query.get("north")).toBe("-1.58");
      expect(query.get("categoryCode")).toBe("AN");
      expect(init?.signal).toBe(signal);
    }
  });

  it("accepts an authoritative empty area", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: { total: 0, limit: 100, offset: 0 },
      }),
    });
    await expect(
      getPublishedMapCenters(mapFilters, {
        fetcher,
        apiUrl: "http://api.test",
      }),
    ).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects a later failed page instead of showing an incomplete catalog", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mapCenter(0)],
          meta: { total: 2, limit: 100, offset: 0 },
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(
      getPublishedMapCenters(mapFilters, {
        fetcher,
        apiUrl: "http://api.test",
      }),
    ).rejects.toThrow("No fue posible cargar");
  });

  it.each([
    { data: [], meta: { total: 2, limit: 100, offset: 0 } },
    { data: [mapCenter(0)], meta: { total: 1, limit: 100, offset: 100 } },
  ])(
    "rejects incoherent pagination before accepting missing places: %j",
    async (page) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => page });
      await expect(
        getPublishedMapCenters(mapFilters, {
          fetcher,
          apiUrl: "http://api.test",
        }),
      ).rejects.toThrow("No fue posible completar");
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("stops if the server repeats a page instead of progressing", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mapCenter(0)],
          meta: { total: 3, limit: 100, offset: 0 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mapCenter(0)],
          meta: { total: 3, limit: 100, offset: 1 },
        }),
      });
    await expect(
      getPublishedMapCenters(mapFilters, {
        fetcher,
        apiUrl: "http://api.test",
      }),
    ).rejects.toThrow("No fue posible completar");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops between pages when the camera area's request is cancelled", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        controller.abort();
        return {
          data: [mapCenter(0)],
          meta: { total: 2, limit: 100, offset: 0 },
        };
      },
    });
    await expect(
      getPublishedMapCenters(mapFilters, {
        fetcher,
        signal: controller.signal,
        apiUrl: "http://api.test",
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
