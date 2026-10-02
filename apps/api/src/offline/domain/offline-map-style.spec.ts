import { describe, expect, it } from "vitest";

import { normalizeOfflineMapStyle } from "./offline-map-style";

const styleUrl = "https://tiles.test/styles/basic/style.json";

describe("offline map resource identities", () => {
  it("resolves every map resource and keeps the exact MapLibre template placeholders", () => {
    const style = normalizeOfflineMapStyle(
      {
        version: 8,
        glyphs: "/fonts/{fontstack}/{range}.pbf",
        sprite: "./sprite",
        sources: {
          openmaptiles: {
            type: "vector",
            url: "/data/v3.json",
            tiles: ["old/{z}/{x}/{y}.pbf"],
          },
          raster: { type: "raster", tiles: ["../../tiles/{z}/{x}/{y}.png"] },
          geojson: { type: "geojson", data: "./places.geojson" },
          video: { type: "video", urls: ["./video.webm"] },
        },
        layers: [
          {
            id: "labels",
            type: "symbol",
            layout: {
              "text-field": "{name}",
              "text-font": ["Open Sans Regular"],
            },
          },
          {
            id: "default-font",
            type: "symbol",
            layout: { "text-field": "{name}" },
          },
        ],
      },
      styleUrl,
    );
    expect(style).toMatchObject({
      glyphs: "https://tiles.test/fonts/{fontstack}/{range}.pbf",
      sprite: "https://tiles.test/styles/basic/sprite",
      sources: {
        openmaptiles: {
          url: "https://tiles.test/data/v3.json",
          maxzoom: 14,
          attribution: "© OpenMapTiles © OpenStreetMap contributors",
        },
        raster: { tiles: ["https://tiles.test/tiles/{z}/{x}/{y}.png"] },
        geojson: { data: "https://tiles.test/styles/basic/places.geojson" },
        video: { urls: ["https://tiles.test/styles/basic/video.webm"] },
      },
    });
    expect(style.sources.openmaptiles).not.toHaveProperty("tiles");
    for (const layer of style.layers) {
      expect(layer.layout).toMatchObject({
        "text-font": ["Noto Sans Regular"],
      });
    }
  });

  it("normalizes a sprite array and preserves inline GeoJSON", () => {
    const data = { type: "FeatureCollection", features: [] };
    const style = normalizeOfflineMapStyle(
      {
        version: 8,
        sprite: [{ id: "default", url: "./sprite" }],
        sources: { poi: { type: "geojson", data } },
        layers: [],
      },
      styleUrl,
    );
    expect(style.sprite).toEqual([
      { id: "default", url: "https://tiles.test/styles/basic/sprite" },
    ]);
    expect(style.sources.poi?.data).toEqual(data);
  });

  it("rejects malformed GL styles and non-HTTP resources before serving a native download", () => {
    for (const value of [
      { version: 7, sources: {}, layers: [] },
      { version: 8, sources: { bad: null }, layers: [] },
      { version: 8, sources: {}, layers: [null] },
      {
        version: 8,
        sources: { bad: { type: "vector", url: "file:///private/data.json" } },
        layers: [],
      },
      {
        version: 8,
        sources: {},
        glyphs: "https://user:secret@tiles.test/fonts.pbf",
        layers: [],
      },
      {
        version: 8,
        sources: { bad: { type: "vector", tiles: [null] } },
        layers: [],
      },
    ]) {
      expect(() => normalizeOfflineMapStyle(value, styleUrl)).toThrow();
    }
  });
});
