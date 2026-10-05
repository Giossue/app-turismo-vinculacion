import type { SymbolLayerSpecification } from "@maplibre/maplibre-react-native";

import { getTurismoColors, type TurismoColorScheme } from "@/core/ui/tokens";
import { establishmentPinColorExpression } from "@/features/establishments/presentation/establishment-pins";
import { basemapPalettes } from "../data/basemap-palette";
import { getMapNameLayout } from "./map-symbol-layout";

type SymbolPaint = SymbolLayerSpecification["paint"];
type SymbolLayout = SymbolLayerSpecification["layout"];

/** Paints and layouts of every labelled layer, for the active theme and style. */
export function getCenterMapLabelStyles({
  fontScale,
  hasGlyphs,
  scheme,
}: Readonly<{
  fontScale: number;
  hasGlyphs: boolean;
  scheme: TurismoColorScheme;
}>) {
  const labelPalette = basemapPalettes[scheme];
  // Los PNG de atractivos comparten el verde del tema general.
  const centerPinColor = getTurismoColors(scheme).primary;
  const labelHalo = {
    "text-halo-color": labelPalette.textHalo,
    "text-halo-width": 1.5,
    "text-halo-blur": 0.5,
  };
  const centerLabelPaint: SymbolPaint = hasGlyphs
    ? { ...labelHalo, "text-color": centerPinColor }
    : undefined;
  const establishmentLabelPaint: SymbolPaint = hasGlyphs
    ? { ...labelHalo, "text-color": establishmentPinColorExpression }
    : undefined;
  const selectedLabelPaint: SymbolPaint = hasGlyphs
    ? {
        ...labelHalo,
        "text-color": [
          "case",
          ["get", "isCenter"],
          centerPinColor,
          establishmentPinColorExpression,
        ],
      }
    : undefined;
  const clusterNameLayout: SymbolLayout | undefined = hasGlyphs
    ? {
        "text-field": ["to-string", ["get", "point_count_abbreviated"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11 * fontScale,
      }
    : undefined;
  return {
    centerLabelPaint,
    centerNameLayout: getMapNameLayout("center", hasGlyphs, fontScale),
    centerPinImage:
      scheme === "dark"
        ? "tourism-center-monument-dark"
        : "tourism-center-monument-light",
    clusterNameLayout,
    establishmentLabelPaint,
    establishmentNameLayout: getMapNameLayout(
      "establishment",
      hasGlyphs,
      fontScale,
    ),
    selectedLabelPaint,
    selectedNameLayout: getMapNameLayout("selected", hasGlyphs, fontScale),
  };
}

export type CenterMapLabelStyles = ReturnType<typeof getCenterMapLabelStyles>;
