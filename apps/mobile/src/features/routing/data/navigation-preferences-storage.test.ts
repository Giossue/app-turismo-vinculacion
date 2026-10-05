import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  defaultNavigationPreferences,
  readNavigationPreferences,
  saveNavigationPreferences,
  setBackgroundTrackingPreference,
} from "./navigation-preferences-storage";

const values = new Map<string, string>();
const setItem = vi.fn(async (key: string, value: string) => {
  values.set(key, value);
});
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: (key: string, value: string) => setItem(key, value),
  },
}));

describe("navigation preferences storage", () => {
  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
    setItem.mockImplementation(async (key: string, value: string) => {
      values.set(key, value);
    });
  });

  it("keeps background tracking off until the person enables it", async () => {
    await expect(readNavigationPreferences()).resolves.toEqual(
      defaultNavigationPreferences,
    );
    expect(defaultNavigationPreferences.backgroundTracking).toBe(false);
  });

  it("persists and restores the opt-in", async () => {
    await expect(
      saveNavigationPreferences({ backgroundTracking: true, version: 1 }),
    ).resolves.toBe(true);
    await expect(readNavigationPreferences()).resolves.toEqual({
      backgroundTracking: true,
      version: 1,
    });
  });

  it("falls back to the defaults on malformed or foreign entries", async () => {
    await saveNavigationPreferences({ backgroundTracking: true, version: 1 });
    const [storedKey] = Array.from(values.keys());
    if (!storedKey) throw new Error("preferences were not stored");
    values.set(storedKey, "{not json");
    await expect(readNavigationPreferences()).resolves.toEqual(
      defaultNavigationPreferences,
    );
    values.set(storedKey, JSON.stringify({ backgroundTracking: "yes" }));
    await expect(readNavigationPreferences()).resolves.toEqual(
      defaultNavigationPreferences,
    );
  });

  it("updates only the background opt-in and skips redundant writes", async () => {
    await expect(setBackgroundTrackingPreference(false)).resolves.toBe(true);
    expect(setItem).not.toHaveBeenCalled();

    await expect(setBackgroundTrackingPreference(true)).resolves.toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
    await expect(readNavigationPreferences()).resolves.toMatchObject({
      backgroundTracking: true,
    });

    await expect(setBackgroundTrackingPreference(false)).resolves.toBe(true);
    await expect(readNavigationPreferences()).resolves.toMatchObject({
      backgroundTracking: false,
    });
  });

  it("resolves false instead of rejecting when storage fails", async () => {
    setItem.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      saveNavigationPreferences({ backgroundTracking: true, version: 1 }),
    ).resolves.toBe(false);
  });
});
