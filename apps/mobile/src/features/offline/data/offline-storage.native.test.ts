import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoredOfflineManifest,
  listStoredOfflineCities,
  listStoredOfflineManifests,
  removeOfflineManifest,
  saveOfflineManifest,
} from "./offline-storage.native";

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  run: vi.fn(),
  all: vi.fn(),
  first: vi.fn(),
}));
vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn(async () => ({
    execAsync: mocks.exec,
    runAsync: mocks.run,
    getAllAsync: mocks.all,
    getFirstAsync: mocks.first,
  })),
}));
const manifest = {
  city: {
    slug: "guaranda",
    name: "Guaranda",
    canton: "Guaranda",
    province: "Bolívar",
    longitude: -79,
    latitude: -1.59,
    package: null,
  },
  package: {
    version: 1,
    zoomMin: 8,
    zoomMax: 17,
    checksumSha256: null,
    publishedAt: null,
  },
  boundary: null,
  centers: [],
  establishments: [],
  pois: [],
  routes: [],
};

describe("native city manifest storage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("saves the full city and both map styles in one SQLite statement", async () => {
    await saveOfflineManifest(manifest);
    expect(mocks.run).toHaveBeenCalledOnce();
    const [sql, slug, version, payload, savedAt] = mocks.run.mock.calls[0];
    expect(sql).toContain("INSERT OR REPLACE");
    expect(slug).toBe("guaranda");
    expect(version).toBe(1);
    expect(JSON.parse(payload)).toEqual(manifest);
    expect(Number.isFinite(Date.parse(savedAt))).toBe(true);
  });
  it("lists only valid locally stored cities, without a remote catalog", async () => {
    mocks.all.mockResolvedValue([
      { payload_json: JSON.stringify(manifest) },
      { payload_json: "broken" },
      { payload_json: JSON.stringify({ city: { slug: "other" } }) },
    ]);
    await expect(listStoredOfflineManifests()).resolves.toEqual([manifest]);
    await expect(listStoredOfflineCities()).resolves.toEqual(["guaranda"]);
  });
  it("uses bound parameters when reading and deleting a city", async () => {
    mocks.first.mockResolvedValue({ payload_json: JSON.stringify(manifest) });
    await expect(getStoredOfflineManifest("guaranda")).resolves.toEqual(
      manifest,
    );
    await removeOfflineManifest("guaranda");
    expect(mocks.first).toHaveBeenCalledWith(
      expect.stringContaining("WHERE city_slug = ?"),
      "guaranda",
    );
    expect(mocks.run).toHaveBeenCalledWith(
      expect.stringContaining(
        "DELETE FROM offline_city_manifests WHERE city_slug = ?",
      ),
      "guaranda",
    );
  });
});
