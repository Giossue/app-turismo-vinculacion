import { getDistanceMeters } from "@/core/geo/distance";
import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import type { PublicCenter } from "../domain/public-center";

export type SearchResultItem =
  | Readonly<{
      kind: "center";
      key: string;
      center: PublicCenter;
      /** Meters from `origin`, or `null` without a location. */
      distanceMeters: number | null;
    }>
  | Readonly<{ kind: "place"; key: string; place: PublicSearchResult }>;

/**
 * Rows of the search results sheet: published centers first (nearest first
 * with `sortByDistance`), then the search places that are not already listed
 * as one of those centers. Each distance is computed once.
 */
export function buildSearchResultItems({
  centers,
  origin,
  places,
  sortByDistance,
}: Readonly<{
  centers: readonly PublicCenter[];
  origin: GeoCoordinate | null;
  places: readonly PublicSearchResult[];
  sortByDistance: boolean;
}>): SearchResultItem[] {
  const centerItems = centers.map((center) => ({
    kind: "center" as const,
    key: `center:${center.code}`,
    center,
    distanceMeters: origin ? getDistanceMeters(center, origin) : null,
  }));
  if (sortByDistance && origin) {
    centerItems.sort(
      (left, right) => (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0),
    );
  }

  const listedCodes = new Set(centers.map((center) => center.code));
  const placeItems = places
    .filter(
      (place) =>
        place.kind !== "center" ||
        !place.centerCode ||
        !listedCodes.has(place.centerCode),
    )
    .map((place) => ({
      kind: "place" as const,
      key: `place:${place.kind}:${place.title}:${place.latitude}:${place.longitude}`,
      place,
    }));

  return [...centerItems, ...placeItems];
}
