import { OfflineManager } from "@maplibre/maplibre-react-native";
import { removeOfflineManifest } from "../data/offline-storage";
import { OfflineDownloadError } from "./offline-download-store";

/** Delete native packs first; retain the manifest when deletion needs retrying. */
export async function removeOfflineCity(slug: string): Promise<void> {
  try {
    const packs = await OfflineManager.getPacks();
    for (const pack of packs) {
      if (pack.metadata.citySlug !== slug) continue;
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
