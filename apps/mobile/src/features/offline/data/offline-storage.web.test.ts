import { beforeEach, describe, expect, it, vi } from "vitest";

import { listStoredOfflineManifests } from "./offline-storage.web";

const values = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getAllKeys: vi.fn(async () => [...values.keys()]),
    multiGet: vi.fn(async (keys: string[]) =>
      keys.map((key) => [key, values.get(key) ?? null]),
    ),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const manifest = {
  city: {
    slug: "guaranda",
    name: "Guaranda",
    canton: "Guaranda",
    province: "Bolívar",
    latitude: -1.59263,
    longitude: -79.00098,
    package: null,
  },
  package: {
    version: 1,
    checksumSha256: null,
    zoomMin: 8,
    zoomMax: 17,
    publishedAt: null,
  },
  boundary: null,
  centers: [],
  routes: [],
};

describe("web offline storage", () => {
  beforeEach(() => {
    values.clear();
  });

  it("skips stored manifests that no longer match the contract", async () => {
    values.set(
      "turismo-vinculacion-offline-city:guaranda",
      JSON.stringify(manifest),
    );
    values.set("turismo-vinculacion-offline-city:roto", "{not json");
    values.set(
      "turismo-vinculacion-offline-city:viejo",
      JSON.stringify({ city: manifest.city }),
    );

    await expect(listStoredOfflineManifests()).resolves.toEqual([manifest]);
  });
});
