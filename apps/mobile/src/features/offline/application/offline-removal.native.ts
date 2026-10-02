import { OfflineManager } from "@maplibre/maplibre-react-native";
import { File } from "expo-file-system";

import { getStoredOfflineManifest, removeOfflineManifest } from "../data/offline-storage";
import { getOfflineStyleDirectory } from "./offline-download";
import { OfflineDownloadError } from "./offline-download-store";

/** Delete native packs first; retain the manifest when deletion needs retrying. */
export async function removeOfflineCity(slug: string): Promise<void> {
  try {
    const manifest = await getStoredOfflineManifest(slug);
    const packs = await OfflineManager.getPacks();
    const styleFiles = new Set<string>();
    if (manifest?.download?.styleFileName) styleFiles.add(manifest.download.styleFileName);
    for (const pack of packs) {
      if (pack.metadata.citySlug !== slug) continue;
      await OfflineManager.deletePack(pack.id);
      if (typeof pack.metadata.styleFileName === "string") styleFiles.add(pack.metadata.styleFileName);
    }
    for (const name of styleFiles) {
      if (!/^[a-zA-Z0-9_-]+\.json$/.test(name)) continue;
      const file = new File(getOfflineStyleDirectory(), name);
      if (file.exists) file.delete();
    }
    await removeOfflineManifest(slug);
  } catch (error) {
    throw new OfflineDownloadError("No pudimos borrar toda la ciudad. Inténtalo de nuevo.", { cause: error });
  }
}
