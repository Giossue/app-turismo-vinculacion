import type { PublicPoiPage } from "../domain/public-poi";

export const PUBLIC_POI_REPOSITORY = Symbol("PUBLIC_POI_REPOSITORY");

export type NearbyPublicPoisQuery = Readonly<{
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category?: string;
  limit: number;
}>;

export interface PublicPoiRepository {
  listNearby(query: NearbyPublicPoisQuery): Promise<PublicPoiPage>;
}
