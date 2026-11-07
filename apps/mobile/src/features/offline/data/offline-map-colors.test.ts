import { describe, expect, it, vi } from "vitest";

import { basemapPalettes } from "@/features/map/data/basemap-palette";
import type { OfflineCityManifest } from "../domain/offline-city";
import { withCurrentMapColors } from "./offline-map-colors";

vi.mock("@/features/map/data/basemap-style-storage", () => ({}));

const oldStyle = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#1c1d1b" },
    },
  ],
};

describe("colores de una ciudad descargada", () => {
  it("aplica la paleta actual a cada tema", () => {
    const manifest = {
      download: { mapStyles: { light: oldStyle, dark: oldStyle } },
    } as unknown as OfflineCityManifest;
    const { download } = withCurrentMapColors(manifest);
    expect(download?.mapStyles.dark.layers[0]).toMatchObject({
      paint: { "background-color": basemapPalettes.dark.background },
    });
    expect(download?.mapStyles.light.layers[0]).toMatchObject({
      paint: { "background-color": basemapPalettes.light.background },
    });
  });

  it("deja igual un paquete sin mapa", () => {
    const manifest = { centers: [] } as unknown as OfflineCityManifest;
    expect(withCurrentMapColors(manifest)).toBe(manifest);
  });
});
