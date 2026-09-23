import type { OfflineCity } from "../domain/offline-city";
import { OfflineDownloadError } from "./offline-download-store";

export async function downloadOfflineCity(
  _city: OfflineCity,
  _onProgress?: (percentage: number) => void,
): Promise<void> {
  throw new OfflineDownloadError(
    "Las descargas de mapas solo están disponibles en la app para Android e iOS.",
  );
}
