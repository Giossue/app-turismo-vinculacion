import { removeOfflineManifest } from "../data/offline-storage";

export async function removeOfflineCity(slug: string): Promise<void> {
  await removeOfflineManifest(slug);
}
