import { describe, expect, it } from "vitest";
import { validateEnvironment } from "./environment";

describe("offline map style configuration", () => {
  it("accepts only a configured HTTP/S URL and keeps an empty value optional", () => {
    expect(validateEnvironment({ OFFLINE_MAP_STYLE_URL: "https://tiles.test/style.json" }).OFFLINE_MAP_STYLE_URL).toBe("https://tiles.test/style.json");
    expect(validateEnvironment({ OFFLINE_MAP_STYLE_URL: " " }).OFFLINE_MAP_STYLE_URL).toBeUndefined();
  });
  it("rejects file URLs and embedded credentials", () => {
    expect(() => validateEnvironment({ OFFLINE_MAP_STYLE_URL: "file:///tmp/style.json" })).toThrow();
    expect(() => validateEnvironment({ OFFLINE_MAP_STYLE_URL: "https://fixture:fixture@tiles.test/style.json" })).toThrow();
  });
});
