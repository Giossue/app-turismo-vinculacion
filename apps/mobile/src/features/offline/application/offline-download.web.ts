import type { OfflineCity } from "../domain/offline-city";

export type OfflineDownloadResult = Readonly<{
  packId: string;
  packageVersion: number;
}>;

export async function downloadOfflineCity(
  _city: OfflineCity,
  _onProgress?: (percentage: number) => void,
): Promise<OfflineDownloadResult> {
  throw new Error(
    "Las descargas de mapas solo están disponibles en Android/iOS.",
  );
}
