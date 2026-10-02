import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getStoredOfflineManifest,
  listStoredOfflineCities,
  listStoredOfflineManifests,
  removeOfflineManifest,
  saveOfflineManifest,
} from "./offline-storage.web";

const values = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getAllKeys: vi.fn(async () => [...values.keys()]),
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
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
  establishments: [],
  pois: [],
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
    await expect(listStoredOfflineCities()).resolves.toEqual(["guaranda"]);
  });

  it("keeps cities independently of query cache TTL and removes only the selected city", async () => {
    await saveOfflineManifest(manifest);
    await saveOfflineManifest({
      ...manifest,
      city: { ...manifest.city, slug: "riobamba" },
    });
    await expect(getStoredOfflineManifest("guaranda")).resolves.toEqual(
      manifest,
    );
    values.set("other-app-setting", "retain");
    await removeOfflineManifest("guaranda");
    await expect(getStoredOfflineManifest("guaranda")).resolves.toBeNull();
    await expect(listStoredOfflineCities()).resolves.toEqual(["riobamba"]);
    expect(values.get("other-app-setting")).toBe("retain");
  });
});
