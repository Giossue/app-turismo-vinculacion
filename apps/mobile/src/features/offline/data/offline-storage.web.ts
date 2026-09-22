import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OfflineCityManifest } from "../domain/offline-city";
import { parseStoredOfflineManifest } from "./offline-api";

const keyPrefix = "turismo-vinculacion-offline-city:";

export async function saveOfflineManifest(
  manifest: OfflineCityManifest,
): Promise<void> {
  await AsyncStorage.setItem(
    `${keyPrefix}${manifest.city.slug}`,
    JSON.stringify(manifest),
  );
}

export async function listStoredOfflineCities(): Promise<readonly string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((key) => key.startsWith(keyPrefix))
    .map((key) => key.slice(keyPrefix.length));
}

export async function listStoredOfflineManifests(): Promise<
  readonly OfflineCityManifest[]
> {
  const slugs = await listStoredOfflineCities();
  const values = await AsyncStorage.multiGet(
    slugs.map((slug) => `${keyPrefix}${slug}`),
  );
  return values.flatMap(([, value]) => {
    const manifest = value ? parseStoredOfflineManifest(value) : null;
    return manifest ? [manifest] : [];
  });
}
