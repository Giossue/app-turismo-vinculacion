import { OfflineManager } from "@maplibre/maplibre-react-native";
import {
  getStoredOfflineManifest,
  removeOfflineManifest,
} from "../data/offline-storage";
import { OfflineDownloadError } from "./offline-download-store";

/** Delete native packs first; retain the manifest when deletion needs retrying. */
export async function removeOfflineCity(slug: string): Promise<void> {
  try {
    const manifest = await getStoredOfflineManifest(slug);
    const packs = await OfflineManager.getPacks();
    const cityPacks = packs
      .filter((pack) => pack.metadata.citySlug === slug)
      .sort(
        (left, right) =>
          Number(left.id === manifest?.download?.packId) -
          Number(right.id === manifest?.download?.packId),
      );
    // Keep the current version usable if cleaning an older pack fails.
    for (const pack of cityPacks) {
      await OfflineManager.deletePack(pack.id);
    }
    await removeOfflineManifest(slug);
  } catch (error) {
    throw new OfflineDownloadError(
      "No pudimos borrar toda la ciudad. Inténtalo de nuevo.",
      { cause: error },
    );
  }
}
