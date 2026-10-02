import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeOfflineCity } from "./offline-removal.native";

const mocks = vi.hoisted(() => ({
  getPacks: vi.fn(),
  deletePack: vi.fn(),
  getManifest: vi.fn(),
  removeManifest: vi.fn(),
  calls: [] as string[],
}));
vi.mock("@maplibre/maplibre-react-native", () => ({
  OfflineManager: { getPacks: mocks.getPacks, deletePack: mocks.deletePack },
}));
vi.mock("../data/offline-storage", () => ({
  getStoredOfflineManifest: mocks.getManifest,
  removeOfflineManifest: mocks.removeManifest,
}));

describe("native offline removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    mocks.getManifest.mockResolvedValue({ download: { packId: "new" } });
    mocks.getPacks.mockResolvedValue([
      { id: "old", metadata: { citySlug: "guaranda" } },
      { id: "new", metadata: { citySlug: "guaranda" } },
      { id: "other", metadata: { citySlug: "riobamba" } },
    ]);
    mocks.deletePack.mockImplementation(async (id: string) => {
      mocks.calls.push(id);
    });
    mocks.removeManifest.mockImplementation(async () => {
      mocks.calls.push("manifest");
    });
  });
  it("removes all city versions and the manifest, preserving other cities", async () => {
    await removeOfflineCity("guaranda");
    expect(mocks.calls).toEqual(["old", "new", "manifest"]);
    expect(mocks.removeManifest).toHaveBeenCalledExactlyOnceWith("guaranda");
  });
  it("keeps metadata for retry if a native pack cannot be removed", async () => {
    mocks.deletePack.mockRejectedValueOnce(new Error("database busy"));
    await expect(removeOfflineCity("guaranda")).rejects.toThrow("borrar toda");
    expect(mocks.removeManifest).not.toHaveBeenCalled();
  });
});
