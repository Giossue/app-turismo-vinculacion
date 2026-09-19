import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";

export const OFFLINE_CITY_REPOSITORY = Symbol("OFFLINE_CITY_REPOSITORY");

export interface OfflineCityRepository {
  listCities(): Promise<readonly OfflineCity[]>;
  getManifest(slug: string): Promise<OfflineCityManifest | null>;
}
