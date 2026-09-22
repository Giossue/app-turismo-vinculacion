import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSearchHistory,
  listSearchHistory,
  rememberSearch,
} from "./search-history-storage";

const values = new Map<string, string>();

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

describe("search history storage", () => {
  beforeEach(() => {
    values.clear();
  });

  it("returns the updated list with the newest search first", async () => {
    await rememberSearch("mirador");
    await expect(rememberSearch("  Cascada ")).resolves.toEqual([
      "Cascada",
      "mirador",
    ]);
    await expect(rememberSearch("MIRADOR")).resolves.toEqual([
      "MIRADOR",
      "Cascada",
    ]);
  });

  it("keeps only the latest eight searches", async () => {
    for (let index = 1; index <= 10; index += 1) {
      await rememberSearch(`búsqueda ${index}`);
    }
    const history = await listSearchHistory();
    expect(history).toHaveLength(8);
    expect(history[0]).toBe("búsqueda 10");
  });

  it("ignores malformed entries and clears the history", async () => {
    values.set(
      "turismo-vinculacion-search-history-v1",
      JSON.stringify(["mirador", 3, " ", null]),
    );
    await expect(listSearchHistory()).resolves.toEqual(["mirador"]);

    await clearSearchHistory();
    await expect(listSearchHistory()).resolves.toEqual([]);
  });
});
