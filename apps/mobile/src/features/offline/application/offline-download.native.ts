import {
  OfflineManager,
  type OfflinePack,
} from "@maplibre/maplibre-react-native";
import { Directory, File, Paths } from "expo-file-system";

import type { GeoBoundingBox } from "@/core/geo/types";
import { loadOfflineMapStyles } from "@/features/map/data/basemap-style";
import { getOfflineCityManifest } from "../data/offline-api";
import { saveOfflineManifest } from "../data/offline-storage";
import type { OfflineCity } from "../domain/offline-city";
import { getOfflineCityBounds } from "../domain/offline-city-bounds";
import { OfflineDownloadError } from "./offline-download-store";

export function getOfflineStyleDirectory(): Directory {
  return new Directory(Paths.document, "offline-map-styles");
}

/**
 * Downloads the street tiles of a city into a new MapLibre pack and then
 * stores its manifest. Previous packs of the city are deleted only after
 * the new one completes, so a failed download keeps the city usable.
 * Callers go through `runOfflineDownload` to avoid concurrent downloads.
 */
export async function downloadOfflineCity(
  city: OfflineCity,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  if (!city.package) {
    throw new OfflineDownloadError("La ciudad no tiene un paquete publicado.");
  }

  const manifest = await getOfflineCityManifest(city.slug);
  if (manifest.city.slug !== city.slug) {
    throw new OfflineDownloadError("El paquete recibido no corresponde a esta ciudad.");
  }
  let styles: Awaited<ReturnType<typeof loadOfflineMapStyles>>;
  try {
    styles = await loadOfflineMapStyles();
  } catch (error) {
    throw new OfflineDownloadError(
      "No pudimos preparar el mapa. Revisa tu conexión e inténtalo de nuevo.",
      { cause: error },
    );
  }

  const bounds = getOfflineCityBounds(manifest);
  const directory = getOfflineStyleDirectory();
  directory.create({ intermediates: true, idempotent: true });
  // OfflineManager expects a URL on both platforms, not a JSON string. Keep
  // the normalized style in documents so the pack downloads Noto Sans too.
  const styleFile = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  styleFile.write(JSON.stringify(styles.light));

  let pack: OfflinePack;
  try {
    pack = await downloadPack({
      bounds,
      citySlug: city.slug,
      maxZoom: manifest.package.zoomMax,
      minZoom: manifest.package.zoomMin,
      onProgress,
      packageVersion: manifest.package.version,
      styleUrl: styleFile.uri,
      styleFileName: styleFile.name,
    });
  } catch (error) {
    deleteStyleFile(styleFile);
    throw error;
  }

  const status = await pack.status().catch(() => null);
  const size = status?.completedResourceSize;
  try {
    await saveOfflineManifest({
      ...manifest,
      download: {
        savedAt: new Date().toISOString(),
        packId: pack.id,
        styleFileName: styleFile.name,
        resourceSizeBytes: typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : null,
        bounds,
        mapStyles: styles,
      },
    });
  } catch (error) {
    await OfflineManager.deletePack(pack.id).catch(() => undefined);
    deleteStyleFile(styleFile);
    throw new OfflineDownloadError(
      "Descargamos el mapa, pero no pudimos guardar la ciudad en el dispositivo.",
      { cause: error },
    );
  }
  // The manifest swap succeeds before old resources are released. Failure
  // here only leaves extra resources; the new city is already usable.
  await deletePreviousPacks(city.slug, pack.id);
}

async function downloadPack({
  bounds,
  citySlug,
  maxZoom,
  minZoom,
  onProgress,
  packageVersion,
  styleUrl,
  styleFileName,
}: Readonly<{
  bounds: GeoBoundingBox;
  citySlug: string;
  maxZoom: number;
  minZoom: number;
  onProgress?: (percentage: number) => void;
  packageVersion: number;
  styleUrl: string;
  styleFileName: string;
}>): Promise<OfflinePack> {
  let resolveDownload!: () => void;
  let rejectDownload!: (error: Error) => void;
  const downloadComplete = new Promise<void>((resolve, reject) => {
    resolveDownload = resolve;
    rejectDownload = reject;
  });
  // MapLibre removes the listeners itself after a `complete` event.
  let listening = true;

  let pack: OfflinePack;
  try {
    // Each download gets a new pack (MapLibre assigns a unique id), so the
    // tiles of the previous version stay until this one completes.
    pack = await OfflineManager.createPack(
      {
        bounds,
        mapStyle: styleUrl,
        maxZoom,
        metadata: { citySlug, packageVersion, styleFileName },
        minZoom,
      },
      (offlinePack, status) => {
        onProgress?.(status.percentage);
        if (status.state === "complete") {
          listening = false;
          resolveDownload();
          return;
        }
        if (status.state === "active") {
          // Some progress events still say `active` for a finished pack.
          offlinePack.status().then(
            (latest) => {
              if (latest.state === "complete") resolveDownload();
            },
            () => undefined,
          );
        }
      },
      () =>
        rejectDownload(
          new OfflineDownloadError(
            "No pudimos descargar los mapas de esta ciudad. Revisa tu conexión e inténtalo de nuevo.",
          ),
        ),
    );
  } catch (error) {
    throw new OfflineDownloadError(
      "No pudimos preparar la descarga de esta ciudad.",
      { cause: error },
    );
  }

  try {
    const initialStatus = await pack.status();
    if (initialStatus.state === "complete") resolveDownload();
    await downloadComplete;
    return pack;
  } catch (error) {
    // Free the partial tiles; the previous pack (if any) stays usable.
    await OfflineManager.deletePack(pack.id).catch(() => undefined);
    throw error;
  } finally {
    if (listening) OfflineManager.removeListener(pack.id);
  }
}

async function deletePreviousPacks(
  citySlug: string,
  keepPackId: string,
): Promise<void> {
  const packs = await OfflineManager.getPacks().catch(() => []);
  for (const pack of packs) {
    if (pack.id === keepPackId || pack.metadata.citySlug !== citySlug) continue;
    // A stale pack left behind only takes space; it never blocks the city.
    try {
      await OfflineManager.deletePack(pack.id);
      const fileName = pack.metadata.styleFileName;
      if (typeof fileName === "string" && /^[a-zA-Z0-9_-]+\.json$/.test(fileName)) {
        deleteStyleFile(new File(getOfflineStyleDirectory(), fileName));
      }
    } catch {
      // Retain the old style if its pack could not be deleted.
    }
  }
}

function deleteStyleFile(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // An orphaned style is harmless and should not hide the original error.
  }
}
