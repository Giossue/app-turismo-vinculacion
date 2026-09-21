import type { PublicEstablishmentSearchItem } from "./public-establishment-search";

export const PUBLIC_NEARBY_ESTABLISHMENT_SEARCH = Symbol(
  "PUBLIC_NEARBY_ESTABLISHMENT_SEARCH",
);

export type NearbyPublicEstablishmentsQuery = Readonly<{
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category?: string;
  limit: number;
}>;

export interface PublicNearbyEstablishmentSearch {
  nearby(
    query: NearbyPublicEstablishmentsQuery,
  ): Promise<readonly PublicEstablishmentSearchItem[]>;
}
