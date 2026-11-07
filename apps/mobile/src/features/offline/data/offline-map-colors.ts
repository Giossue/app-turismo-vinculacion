import { applyBasemapPalette } from "@/features/map/data/basemap-style";
import type { OfflineCityManifest } from "../domain/offline-city";

/**
 * Una descarga guarda los colores de su fecha. Se actualizan al leerla: las
 * URLs de teselas y fuentes no cambian, así que el paquete sigue sirviendo.
 */
export function withCurrentMapColors(
  manifest: OfflineCityManifest,
): OfflineCityManifest {
  const { download } = manifest;
  if (!download) return manifest;
  return {
    ...manifest,
    download: {
      ...download,
      mapStyles: {
        light: applyBasemapPalette(download.mapStyles.light, "light"),
        dark: applyBasemapPalette(download.mapStyles.dark, "dark"),
      },
    },
  };
}
