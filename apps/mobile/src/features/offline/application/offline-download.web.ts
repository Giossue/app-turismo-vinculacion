import type { OfflineCity } from "../domain/offline-city";
import { OfflineDownloadError } from "./offline-download-store";
import { messages } from "@/core/i18n/language";

export async function downloadOfflineCity(
  _city: OfflineCity,
  _onProgress?: (percentage: number) => void,
): Promise<void> {
  throw new OfflineDownloadError(messages().offline.errors.webOnly);
}
