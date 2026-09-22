import { beforeEach, describe, expect, it, vi } from "vitest";

import { importLegacySavedCenters } from "../application/import-legacy-saved-centers";
import { listLegacySavedCenters } from "./saved-centers-storage";

const values = new Map<string, string>();
const storageKey = "turismo-vinculacion-saved-centers-v1";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const firstCenter = {
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
} as const;

const secondCenter = {
  ...firstCenter,
  code: "020201MC010101001",
  name: "Centro",
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("legacy saved centers", () => {
  beforeEach(() => {
    values.clear();
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://api.test/api/v1");
  });

  it("ignores malformed persisted entries", async () => {
    values.set(
      storageKey,
      JSON.stringify([{ code: "incompleto" }, firstCenter]),
    );

    await expect(listLegacySavedCenters()).resolves.toEqual([firstCenter]);
  });

  it("uploads the device list once and then forgets it", async () => {
    values.set(storageKey, JSON.stringify([firstCenter, secondCenter]));
    const request = vi.fn(async (input: RequestInfo | URL) =>
      response(200, {
        data: String(input).endsWith(firstCenter.code)
          ? firstCenter
          : secondCenter,
      }),
    );

    await importLegacySavedCenters(request);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith(
      `http://api.test/api/v1/favorites/centers/${firstCenter.code}`,
      { method: "PUT" },
    );
    expect(values.has(storageKey)).toBe(false);

    await importLegacySavedCenters(request);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps only the uploads that failed while the API was unreachable", async () => {
    values.set(storageKey, JSON.stringify([firstCenter, secondCenter]));
    const request = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith(firstCenter.code)) {
        throw new TypeError("Network request failed");
      }
      return response(404, {});
    });

    await importLegacySavedCenters(request);

    await expect(listLegacySavedCenters()).resolves.toEqual([firstCenter]);
  });
});
