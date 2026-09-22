import type { OfflineCity } from "../domain/offline-city";

export async function downloadOfflineCity(
  _city: OfflineCity,
  _onProgress?: (percentage: number) => void,
): Promise<void> {
  throw new Error(
    "Las descargas de mapas solo están disponibles en Android/iOS.",
  );
}
