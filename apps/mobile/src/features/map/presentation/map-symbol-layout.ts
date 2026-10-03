import type {
  StyleSpecification,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-react-native";

import { mapPlaceZoom } from "../domain/map-place-priority";

type SymbolLayout = NonNullable<SymbolLayerSpecification["layout"]>;

/** Native mobile renderers require a valid glyph template to draw map text. */
export function hasMapLabelGlyphs(style: StyleSpecification): boolean {
  return (
    typeof style.glyphs === "string" &&
    /^https?:\/\//i.test(style.glyphs) &&
    style.glyphs.includes("{fontstack}") &&
    style.glyphs.includes("{range}")
  );
}

export const mapPinLayout: SymbolLayout = {
  "icon-allow-overlap": false,
  "icon-anchor": "bottom",
  "icon-ignore-placement": false,
  "icon-padding": 4,
  "icon-size": 0.42,
  "symbol-z-order": "source",
};

export function getMapNameLayout(
  kind: "center" | "establishment" | "selected",
  hasGlyphs: boolean,
  fontScale: number,
): SymbolLayout {
  if (!hasGlyphs) return {};
  return {
    "text-field":
      kind === "selected"
        ? ["get", "name"]
        : kind === "center"
          ? [
              "step",
              ["zoom"],
              [
                "case",
                [">=", ["get", "hierarchyRank"], 3],
                ["get", "name"],
                "",
              ],
              mapPlaceZoom.centerName,
              ["get", "name"],
            ]
          : [
              "step",
              ["zoom"],
              "",
              mapPlaceZoom.establishmentName,
              ["get", "name"],
            ],
    "text-font": ["Noto Sans Regular"],
    "text-size": 12 * fontScale,
    "text-max-width": 10,
    "text-line-height": 1.15,
    "text-variable-anchor": ["left", "right", "top", "bottom"],
    "text-radial-offset": 1.25,
    "text-justify": "auto",
    "text-padding": 3,
    "text-allow-overlap": false,
    "text-ignore-placement": false,
    "text-optional": true,
  };
}
