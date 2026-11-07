import { describe, expect, it } from "vitest";

import { getContrastRatio } from "@/core/ui/color-contrast";
import { basemapPalettes } from "@/features/map/data/basemap-palette";
import { establishmentPinDarkColors } from "./establishment-pin-dark-colors";

describe("pines de establecimientos en modo oscuro", () => {
  const { background, landuse, residential } = basemapPalettes.dark;

  it.each(Object.entries(establishmentPinDarkColors))(
    "%s contrasta con el terreno sin necesitar borde",
    (_key, color) => {
      for (const land of [background, landuse, residential]) {
        expect(getContrastRatio(color, land)).toBeGreaterThanOrEqual(3);
      }
    },
  );
});
