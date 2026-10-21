import { summarizeOfflineManifest } from "./offline-summary";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OfflineCityManifest } from "../domain/offline-city";
import { parseStoredOfflineManifest } from "./offline-api";

const keyPrefix = "rumbo-ec-offline-city:";

export async function saveOfflineManifest(
  manifest: OfflineCityManifest,
): Promise<void> {
  await AsyncStorage.setItem(
    `${keyPrefix}${manifest.city.slug}`,
    JSON.stringify(manifest),
  );
}

export async function listStoredOfflineCities(): Promise<readonly string[]> {
  const manifests = await listStoredOfflineManifests();
  return manifests.map((manifest) => manifest.city.slug);
}

export async function getStoredOfflineManifest(
  slug: string,
): Promise<OfflineCityManifest | null> {
  const value = await AsyncStorage.getItem(`${keyPrefix}${slug}`);
  return value ? parseStoredOfflineManifest(value) : null;
}

export async function removeOfflineManifest(slug: string): Promise<void> {
  await AsyncStorage.removeItem(`${keyPrefix}${slug}`);
}

async function listStoredKeys(): Promise<readonly string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(keyPrefix)).sort();
}

export async function listStoredOfflineManifests(): Promise<
  readonly OfflineCityManifest[]
> {
  const keys = await listStoredKeys();
  const values = await AsyncStorage.multiGet(keys);
  return values.flatMap(([, value]) => {
    const manifest = value ? parseStoredOfflineManifest(value) : null;
    return manifest ? [manifest] : [];
  });
}

export async function listStoredOfflineSummaries() {
  const values = await AsyncStorage.multiGet(await listStoredKeys());
  return values.flatMap(([, value]) => {
    const manifest = value ? parseStoredOfflineManifest(value) : null;
    return manifest && value
      ? [
          summarizeOfflineManifest(
            manifest,
            new TextEncoder().encode(value).length,
          ),
        ]
      : [];
  });
}

export async function listStoredOfflineCenterRecords(code?: string) {
  return (await listStoredOfflineManifests()).flatMap((manifest) =>
    manifest.centers
      .filter((center) => !code || center.code === code)
      .map((center) => ({ center, cityName: manifest.city.name })),
  );
}
