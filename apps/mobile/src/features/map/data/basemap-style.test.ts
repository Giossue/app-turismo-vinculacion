import { describe, expect, it } from "vitest";

import { basemapPalettes } from "./basemap-palette";
import { getFallbackMapStyle, normalizeSelfHostedStyle } from "./basemap-style";

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
    expect(residential.paint).toMatchObject({ "fill-color": "#232624" });
    expect(aeroway.paint).toMatchObject({
      "fill-extrusion-color": "#2e302e",
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
      "line-opacity": 0.84,
    });
    expect(label.layout).toMatchObject({ "text-font": ["Noto Sans Regular"] });
    expect(label.paint).toMatchObject({
      "text-color": basemapPalettes.dark.text,
    });
  });

  it("falls back to a neutral background", () => {
    expect(getFallbackMapStyle("light")).toMatchObject({
      layers: [{ paint: { "background-color": "#f5f7f8" } }],
    });
  });

  it("resolves every resource to the same URL used by the offline pack", () => {
    const style = normalizeSelfHostedStyle({version:8, glyphs:"/fonts/{fontstack}/{range}.pbf", sprite:"./sprite", sources:{openmaptiles:{type:"vector",url:"/data/v3.json"},other:{type:"raster", tiles:["../../tiles/{z}/{x}/{y}.png"]}}, layers:[]}, "light", styleUrl);
    expect(style).toMatchObject({glyphs:"https://tiles.test/fonts/{fontstack}/{range}.pbf",sprite:"https://tiles.test/styles/basic/sprite",sources:{openmaptiles:{url:"https://tiles.test/data/v3.json",maxzoom:14},other:{tiles:["https://tiles.test/tiles/{z}/{x}/{y}.png"]}}});
  });

  it("rejects invalid styles before passing them to MapLibre", () => {
    expect(() => normalizeSelfHostedStyle({version:7,sources:{},layers:[]},"light",styleUrl)).toThrow("invalid style");
    expect(() => normalizeSelfHostedStyle({version:8,sources:{broken:null},layers:[]},"light",styleUrl)).toThrow("invalid style");
    expect(() => normalizeSelfHostedStyle({version:8,sources:{},layers:[null]},"light",styleUrl)).toThrow("invalid style");
  });
});
