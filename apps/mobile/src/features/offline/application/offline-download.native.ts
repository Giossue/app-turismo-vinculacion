import { OfflineManager, type OfflinePack } from "@maplibre/maplibre-react-native";

import { getCoordinateBounds } from "@/core/geo/bounds";
import type { GeoBoundingBox } from "@/core/geo/types";
import { getSelfHostedStyleUrl } from "@/features/map/data/basemap-style";
import { getOfflineCityManifest } from "../data/offline-api";
import { saveOfflineManifest } from "../data/offline-storage";
import type { OfflineCity } from "../domain/offline-city";
import { OfflineDownloadError } from "./offline-download-store";

// Guaranda, used when a city has neither boundary nor coordinates.
const defaultCityCenter = { latitude: -1.59263, longitude: -79.00098 };
const fallbackCityRadiusDegrees = 0.12;

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

  const styleUrl = getSelfHostedStyleUrl();
  if (!styleUrl) {
    throw new OfflineDownloadError(
      "Los mapas sin conexión no están disponibles en este momento.",
    );
  }

  const manifest = await getOfflineCityManifest(city.slug);
  const pack = await downloadPack({
    bounds: getCityBounds(manifest.boundary, city),
    citySlug: city.slug,
    maxZoom: manifest.package.zoomMax,
    minZoom: manifest.package.zoomMin,
    onProgress,
    packageVersion: manifest.package.version,
    styleUrl,
  });

  await deletePreviousPacks(city.slug, pack.id);
  try {
    await saveOfflineManifest(manifest);
  } catch (error) {
    throw new OfflineDownloadError(
      "Descargamos el mapa, pero no pudimos guardar la ciudad en el dispositivo.",
      { cause: error },
    );
  }
}

async function downloadPack({
  bounds,
  citySlug,
  maxZoom,
  minZoom,
  onProgress,
  packageVersion,
  styleUrl,
}: Readonly<{
  bounds: GeoBoundingBox;
  citySlug: string;
  maxZoom: number;
  minZoom: number;
  onProgress?: (percentage: number) => void;
  packageVersion: number;
  styleUrl: string;
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
        metadata: { citySlug, packageVersion },
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
    await OfflineManager.deletePack(pack.id).catch(() => undefined);
  }
}

function getCityBounds(boundary: unknown, city: OfflineCity): GeoBoundingBox {
  const boundaryBounds = getCoordinateBounds(iterateCoordinates(boundary));
  if (boundaryBounds) return boundaryBounds;

  const longitude = city.longitude ?? defaultCityCenter.longitude;
  const latitude = city.latitude ?? defaultCityCenter.latitude;
  return [
    longitude - fallbackCityRadiusDegrees,
    latitude - fallbackCityRadiusDegrees,
    longitude + fallbackCityRadiusDegrees,
    latitude + fallbackCityRadiusDegrees,
  ];
}

/** Yields every `[longitude, latitude]` pair nested in a GeoJSON value. */
function* iterateCoordinates(
  value: unknown,
): Generator<readonly [number, number]> {
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) {
        yield* iterateCoordinates(child);
      }
    }
    return;
  }
  if (value.length >= 2 && value.every((item) => typeof item === "number")) {
    yield [Number(value[0]), Number(value[1])];
    return;
  }
  for (const child of value) yield* iterateCoordinates(child);
}
