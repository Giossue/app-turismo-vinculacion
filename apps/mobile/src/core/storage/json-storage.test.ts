import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { readJson, removeJson, writeJson } from "./json-storage";

const values = new Map<string, string>();
const getItem = vi.fn(async (key: string) => values.get(key) ?? null);

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (key: string) => getItem(key),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const schema = z.object({ choice: z.literal("guest") });

describe("json storage", () => {
  beforeEach(() => {
    values.clear();
    getItem.mockClear();
  });

  it("round-trips a value that matches the schema", async () => {
    await writeJson("key", { choice: "guest" });
    await expect(readJson("key", schema)).resolves.toEqual({
      choice: "guest",
    });
    await removeJson("key");
    await expect(readJson("key", schema)).resolves.toBeNull();
  });

  it("resolves null for missing, malformed and schema-invalid entries", async () => {
    await expect(readJson("missing", schema)).resolves.toBeNull();
    values.set("raw", "guest");
    await expect(readJson("raw", schema)).resolves.toBeNull();
    values.set("other", JSON.stringify({ choice: "member" }));
    await expect(readJson("other", schema)).resolves.toBeNull();
  });

  it("never rejects when the storage itself fails", async () => {
    getItem.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(readJson("key", schema)).resolves.toBeNull();
  });
});
