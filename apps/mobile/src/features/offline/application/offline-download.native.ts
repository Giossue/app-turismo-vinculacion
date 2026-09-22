import { OfflineManager } from "@maplibre/maplibre-react-native";

import { getCoordinateBounds } from "@/core/geo/bounds";
import type { GeoBoundingBox } from "@/core/geo/types";
import { getSelfHostedStyleUrl } from "@/features/map/data/basemap-style";
import { getOfflineCityManifest } from "../data/offline-api";
import { saveOfflineManifest } from "../data/offline-storage";
import type { OfflineCity } from "../domain/offline-city";

// Guaranda, used when a city has neither boundary nor coordinates.
const defaultCityCenter = { latitude: -1.59263, longitude: -79.00098 };
const fallbackCityRadiusDegrees = 0.12;

export async function downloadOfflineCity(
  city: OfflineCity,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  if (!city.package)
    throw new Error("La ciudad no tiene un paquete publicado.");

  const styleUrl = getSelfHostedStyleUrl();
  if (!styleUrl) {
    throw new Error("EXPO_PUBLIC_TILESERVER_STYLE_URL no está configurada");
  }

  const manifest = await getOfflineCityManifest(city.slug);
  const existingPacks = await OfflineManager.getPacks();
  for (const pack of existingPacks) {
    if (pack.metadata.citySlug === city.slug) {
      await OfflineManager.deletePack(pack.id);
    }
  }

  const bounds = getCityBounds(manifest.boundary, city);
  let resolveDownload!: () => void;
  let rejectDownload!: (error: Error) => void;
  const downloadComplete = new Promise<void>((resolve, reject) => {
    resolveDownload = resolve;
    rejectDownload = reject;
  });
  const pack = await OfflineManager.createPack(
    {
      bounds,
      mapStyle: styleUrl,
      maxZoom: manifest.package.zoomMax,
      metadata: {
        citySlug: city.slug,
        packageVersion: manifest.package.version,
      },
      minZoom: manifest.package.zoomMin,
    },
    async (offlinePack, status) => {
      onProgress?.(status.percentage);
      if (status.state === "complete") {
        resolveDownload();
        return;
      }
      if (status.state === "active") {
        const latest = await offlinePack.status();
        if (latest.state === "complete") resolveDownload();
      }
    },
    (_offlinePack, error) => rejectDownload(new Error(error.message)),
  );
  const initialStatus = await pack.status();
  if (initialStatus.state === "complete") resolveDownload();
  await downloadComplete;
  await saveOfflineManifest(manifest);
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
