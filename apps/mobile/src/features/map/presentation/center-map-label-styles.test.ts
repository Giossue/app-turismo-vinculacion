import { describe, expect, it, vi } from "vitest";

import { getContrastRatio } from "@/core/ui/color-contrast";
import { basemapPalettes } from "../data/basemap-palette";
import { getCenterMapLabelStyles } from "./center-map-label-styles";

vi.mock("@/features/establishments/presentation/establishment-pins", () => ({
  getEstablishmentPinColorExpression: (scheme: string) => ["color", scheme],
  getEstablishmentPinImageExpression: (scheme: string) => ["image", scheme],
}));

const options = { fontScale: 1, hasGlyphs: true };

describe("etiquetas de establecimientos", () => {
  it("usa un texto legible en modo oscuro", () => {
    const dark = basemapPalettes.dark;
    const { establishmentLabelPaint, selectedLabelPaint } =
      getCenterMapLabelStyles({ ...options, scheme: "dark" });

    expect(establishmentLabelPaint?.["text-color"]).toBe(dark.text);
    expect(JSON.stringify(selectedLabelPaint?.["text-color"])).toContain(
      dark.text,
    );
    expect(getContrastRatio(dark.text, dark.textHalo)).toBeGreaterThanOrEqual(
      7,
    );
  });

  it("conserva el color de categoría en modo claro", () => {
    const { establishmentLabelPaint } = getCenterMapLabelStyles({
      ...options,
      scheme: "light",
    });

    expect(establishmentLabelPaint?.["text-color"]).toEqual(["color", "light"]);
  });

  it("elige el color de los puntos del tema activo", () => {
    expect(
      getCenterMapLabelStyles({ ...options, scheme: "dark" })
        .establishmentDotColor,
    ).toEqual(["color", "dark"]);
    expect(
      getCenterMapLabelStyles({ ...options, scheme: "light" })
        .establishmentDotColor,
    ).toEqual(["color", "light"]);
  });

  it("elige la imagen de pin del tema activo", () => {
    expect(
      getCenterMapLabelStyles({ ...options, scheme: "dark" })
        .establishmentPinImage,
    ).toEqual(["image", "dark"]);
    expect(
      getCenterMapLabelStyles({ ...options, scheme: "light" })
        .establishmentPinImage,
    ).toEqual(["image", "light"]);
  });
});
