import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFallbackMapStyle } from "./basemap-style";
import {
  readStoredBasemapStyle,
  saveStoredBasemapStyles,
} from "./basemap-style-storage";

const values = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

describe("persistent basemap style", () => {
  beforeEach(() => values.clear());
  it("restores both themes without expiring the downloaded style", async () => {
    const styles = {
      light: getFallbackMapStyle("light"),
      dark: getFallbackMapStyle("dark"),
    };
    await saveStoredBasemapStyles(styles, "https://tiles.test/style.json");
    await expect(
      readStoredBasemapStyle("light", "https://tiles.test/style.json"),
    ).resolves.toEqual(styles.light);
    await expect(
      readStoredBasemapStyle("dark", "https://tiles.test/style.json"),
    ).resolves.toEqual(styles.dark);
    await expect(
      readStoredBasemapStyle("dark", "https://another.test/style.json"),
    ).resolves.toBeNull();
  });
  it("ignores corrupt JSON and invalid native style objects", async () => {
    values.set("turismo-vinculacion-basemap-style:v1", "bad json");
    await expect(
      readStoredBasemapStyle("light", "https://tiles.test/style.json"),
    ).resolves.toBeNull();
    values.set(
      "turismo-vinculacion-basemap-style:v1",
      JSON.stringify({
        styleUrl: "url",
        styles: { light: { version: 8, sources: {} } },
      }),
    );
    await expect(readStoredBasemapStyle("light", "url")).resolves.toBeNull();
  });
});
