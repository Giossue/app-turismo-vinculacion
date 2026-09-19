import { OfflineManager } from "@maplibre/maplibre-react-native";

import { getOfflineCityManifest } from "../data/offline-api";
import { saveOfflineManifest } from "../data/offline-storage";
import type { OfflineCity } from "../domain/offline-city";

export type OfflineDownloadResult = Readonly<{
  packId: string;
  packageVersion: number;
}>;

const selfHostedMapStyleUrl =
  process.env.EXPO_PUBLIC_TILESERVER_STYLE_URL?.trim() ||
  "https://mapas.devs-ueb.tech/styles/basic-preview/style.json";

export async function downloadOfflineCity(
  city: OfflineCity,
  onProgress?: (percentage: number) => void,
): Promise<OfflineDownloadResult> {
  if (!city.package)
    throw new Error("La ciudad no tiene un paquete publicado.");

  const manifest = await getOfflineCityManifest(city.slug);
  const existingPacks = await OfflineManager.getPacks();
  for (const pack of existingPacks) {
    if (pack.metadata.citySlug === city.slug) {
      await OfflineManager.deletePack(pack.id);
    }
  }

  const bounds = getBounds(manifest.boundary, city.latitude, city.longitude);
  let resolveDownload!: () => void;
  let rejectDownload!: (error: Error) => void;
  const downloadComplete = new Promise<void>((resolve, reject) => {
    resolveDownload = resolve;
    rejectDownload = reject;
  });
  const pack = await OfflineManager.createPack(
    {
      bounds,
      mapStyle: selfHostedMapStyleUrl,
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
  return { packId: pack.id, packageVersion: manifest.package.version };
}

function getBounds(
  boundary: unknown,
  latitude: number | null,
  longitude: number | null,
): [number, number, number, number] {
  const coordinates: number[][] = [];
  collectCoordinates(boundary, coordinates);
  if (coordinates.length) {
    const longitudes = coordinates.map(([value]) => value);
    const latitudes = coordinates.map(([, value]) => value);
    return [
      Math.min(...longitudes),
      Math.min(...latitudes),
      Math.max(...longitudes),
      Math.max(...latitudes),
    ];
  }
  const centerLongitude = longitude ?? -79.00098;
  const centerLatitude = latitude ?? -1.59263;
  return [
    centerLongitude - 0.12,
    centerLatitude - 0.12,
    centerLongitude + 0.12,
    centerLatitude + 0.12,
  ];
}

function collectCoordinates(value: unknown, output: number[][]): void {
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") {
      for (const child of Object.values(value))
        collectCoordinates(child, output);
    }
    return;
  }
  if (value.length >= 2 && value.every((item) => typeof item === "number")) {
    output.push([Number(value[0]), Number(value[1])]);
    return;
  }
  for (const child of value) collectCoordinates(child, output);
}
