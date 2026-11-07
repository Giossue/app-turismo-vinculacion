import { describe, expect, it, vi } from "vitest";

import { getContrastRatio } from "@/core/ui/color-contrast";
import { getTurismoColors, getTurismoMapColors } from "@/core/ui/tokens";
import { basemapPalettes } from "./basemap-palette";
import {
  getFallbackMapStyle,
  loadSelfHostedMapStyle,
  normalizeSelfHostedStyle,
} from "./basemap-style";
import { readStoredBasemapStyle } from "./basemap-style-storage";

vi.mock("./basemap-style-storage", () => ({
  readStoredBasemapStyle: vi.fn(),
  saveStoredBasemapStyles: vi.fn(),
}));

const styleUrl = "https://tiles.test/styles/basic/style.json";

function normalizeLayers(
  layers: Record<string, unknown>[],
  scheme: "light" | "dark",
) {
  const style = normalizeSelfHostedStyle(
    { version: 8, sources: {}, layers },
    scheme,
    styleUrl,
  ) as unknown as { layers: Record<string, Record<string, unknown>>[] };
  return style.layers;
}

describe("normalizeSelfHostedStyle", () => {
  it("recolors fills with the first matching rule", () => {
    const [building, water, residential, aeroway, other] = normalizeLayers(
      [
        { id: "building", type: "fill", "source-layer": "building" },
        { id: "water", type: "fill", "source-layer": "water" },
        { id: "landuse-residential", type: "fill" },
        { id: "aeroway-area", type: "fill" },
        { id: "landcover", type: "fill" },
      ],
      "light",
    );

    expect(building.paint).toMatchObject({
      "fill-color": basemapPalettes.light.building,
      "fill-opacity": 0.9,
    });
    expect(water.paint).toMatchObject({
      "fill-color": basemapPalettes.light.water,
      "fill-opacity": 0.82,
    });
    expect(residential.paint).toMatchObject({ "fill-color": "#fffdfa" });
    expect(aeroway.paint).toMatchObject({ "fill-color": "#f0eee9" });
    expect(other.paint).toMatchObject({
      "fill-color": basemapPalettes.light.landuse,
      "fill-opacity": 0.78,
    });
  });

  it("keeps the dark-mode fills for residential and aeroway areas", () => {
    const [residential, aeroway] = normalizeLayers(
      [
        { id: "landuse-residential", type: "fill" },
        { id: "aeroway-area", type: "fill-extrusion" },
      ],
      "dark",
    );
    expect(residential.paint).toMatchObject({
      "fill-color": basemapPalettes.dark.residential,
    });
    expect(aeroway.paint).toMatchObject({
      "fill-extrusion-color": basemapPalettes.dark.aeroway,
      "fill-extrusion-opacity": 0.9,
    });
  });

  it("hides road casings and tones down roads and labels", () => {
    const [casing, major, label] = normalizeLayers(
      [
        { id: "road_casing", type: "line" },
        { id: "road_primary", type: "line" },
        {
          id: "place_label",
          type: "symbol",
          layout: { "text-font": ["Open Sans Regular"] },
          paint: { "text-color": "#000" },
        },
      ],
      "dark",
    );
    expect(casing.layout).toMatchObject({ visibility: "none" });
    expect(major.paint).toMatchObject({
      "line-color": basemapPalettes.dark.roadMajor,
      "line-opacity": 0.92,
    });
    expect(label.layout).toMatchObject({ "text-font": ["Noto Sans Regular"] });
    expect(label.paint).toMatchObject({
      "text-color": basemapPalettes.dark.text,
    });
  });

  it("falls back to a neutral background", () => {
    expect(getFallbackMapStyle("light")).toMatchObject({
      layers: [{ paint: { "background-color": "#f5f6f8" } }],
    });
  });

  it("resolves every resource to the same URL used by the offline pack", () => {
    const style = normalizeSelfHostedStyle(
      {
        version: 8,
        glyphs: "/fonts/{fontstack}/{range}.pbf",
        sprite: "./sprite",
        sources: {
          openmaptiles: { type: "vector", url: "/data/v3.json" },
          other: { type: "raster", tiles: ["../../tiles/{z}/{x}/{y}.png"] },
        },
        layers: [],
      },
      "light",
      styleUrl,
    );
    expect(style).toMatchObject({
      glyphs: "https://tiles.test/fonts/{fontstack}/{range}.pbf",
      sprite: "https://tiles.test/styles/basic/sprite",
      sources: {
        openmaptiles: { url: "https://tiles.test/data/v3.json", maxzoom: 14 },
        other: { tiles: ["https://tiles.test/tiles/{z}/{x}/{y}.png"] },
      },
    });
  });

  it("rejects invalid styles before passing them to MapLibre", () => {
    expect(() =>
      normalizeSelfHostedStyle(
        { version: 7, sources: {}, layers: [] },
        "light",
        styleUrl,
      ),
    ).toThrow("invalid style");
    expect(() =>
      normalizeSelfHostedStyle(
        { version: 8, sources: { broken: null }, layers: [] },
        "light",
        styleUrl,
      ),
    ).toThrow("invalid style");
    expect(() =>
      normalizeSelfHostedStyle(
        { version: 8, sources: {}, layers: [null] },
        "light",
        styleUrl,
      ),
    ).toThrow("invalid style");
  });
});

describe("mapa en modo oscuro", () => {
  const dark = basemapPalettes.dark;

  it("separa las calles del terreno", () => {
    for (const land of [dark.background, dark.landuse, dark.residential]) {
      expect(getContrastRatio(dark.roadMajor, land)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(dark.roadMinor, land)).toBeGreaterThanOrEqual(3);
    }
  });

  it("distingue el agua y los edificios del terreno", () => {
    expect(
      getContrastRatio(dark.water, dark.background),
    ).toBeGreaterThanOrEqual(2);
    expect(
      getContrastRatio(dark.building, dark.residential),
    ).toBeGreaterThanOrEqual(1.4);
  });

  it("deja el terreno por debajo de los controles flotantes", () => {
    const { mapControlSurface, text } = getTurismoColors("dark");
    for (const land of [dark.background, dark.landuse, dark.residential]) {
      expect(getContrastRatio(mapControlSurface, land)).toBeGreaterThanOrEqual(
        1.5,
      );
    }
    expect(getContrastRatio(text, mapControlSurface)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("deja el terreno por debajo de los pines oscuros", () => {
    for (const land of [dark.background, dark.landuse, dark.residential]) {
      expect(getContrastRatio("#334155", land)).toBeGreaterThanOrEqual(1.4);
    }
  });

  it("mantiene visible la ruta sobre el terreno", () => {
    expect(
      getContrastRatio(getTurismoMapColors("dark").location, dark.background),
    ).toBeGreaterThanOrEqual(3);
  });

  it("aplica la paleta actual a un estilo guardado con colores anteriores", async () => {
    vi.stubEnv("EXPO_PUBLIC_TILESERVER_STYLE_URL", styleUrl);
    vi.mocked(readStoredBasemapStyle).mockResolvedValue({
      version: 8,
      sources: {},
      layers: [
        {
          id: "background",
          type: "background",
          paint: { "background-color": "#1c1d1b" },
        },
        {
          id: "road_primary",
          type: "line",
          source: "openmaptiles",
          paint: { "line-color": "#7b8585", "line-opacity": 0.84 },
        },
      ],
    });

    const style = await loadSelfHostedMapStyle("dark");

    expect(style.layers[0]).toMatchObject({
      paint: { "background-color": dark.background },
    });
    expect(style.layers[1]).toMatchObject({
      paint: { "line-color": dark.roadMajor, "line-opacity": 0.92 },
    });
    vi.unstubAllEnvs();
  });
});
