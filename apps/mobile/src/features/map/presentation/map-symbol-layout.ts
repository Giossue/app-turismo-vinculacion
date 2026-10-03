import type {
  StyleSpecification,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-react-native";

import { mapPlaceZoom } from "../domain/map-place-priority";

const pinOverlapZoom = 16;

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
  // Desde el zoom de calle los pines dejan de ocultarse entre sí: así no
  // parpadean al cargar zonas y los que comparten sitio siguen visibles.
  "icon-allow-overlap": ["step", ["zoom"], false, pinOverlapZoom, true],
  "icon-anchor": "bottom",
  "icon-ignore-placement": false,
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
    // A text bottom anchor places the label above the point, over the pin.
    // Side anchors and a text top anchor leave the icon clear.
    "text-variable-anchor": ["left", "right", "top"],
    "text-radial-offset": 1.25,
    "text-justify": "auto",
    "text-padding": 3,
    "text-allow-overlap": false,
    "text-ignore-placement": false,
    "text-optional": true,
  };
}
