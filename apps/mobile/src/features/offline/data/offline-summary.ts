import type { GeoBoundingBox } from "@/core/geo/types";
import type {
  OfflineCityManifest,
  OfflineCitySummary,
} from "../domain/offline-city";

export function summarizeOfflineManifest(
  manifest: OfflineCityManifest,
  contentSizeBytes?: number,
): OfflineCitySummary {
  const { download } = manifest;
  return {
    city: manifest.city,
    package: manifest.package,
    bounds: manifest.bounds,
    counts: {
      centers: manifest.centers.length,
      establishments: manifest.establishments.length,
      pois: manifest.pois.length,
      routes: manifest.routes.length,
    },
    download: download
      ? {
          savedAt: download.savedAt,
          packId: download.packId,
          resourceSizeBytes: download.resourceSizeBytes,
          bounds: download.bounds,
        }
      : undefined,
    contentSizeBytes,
  };
}

/** Los paquetes antiguos sin límites conservan su cobertura. */
export function offlineSummaryIntersects(
  summary: OfflineCitySummary,
  area?: GeoBoundingBox | null,
): boolean {
  const bounds = summary.download?.bounds ?? summary.bounds;
  return (
    !area ||
    !bounds ||
    (bounds[0] <= area[2] &&
      bounds[2] >= area[0] &&
      bounds[1] <= area[3] &&
      bounds[3] >= area[1])
  );
}
