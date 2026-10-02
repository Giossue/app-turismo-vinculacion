import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { searchPublicPlaces } from "../data/search-api";
import { isValidSearchBounds, type SearchFilters } from "../domain/search-suggestion";

export function usePublicSearch(
  query: string,
  coordinate?: GeoCoordinate | null,
  filters: SearchFilters & Readonly<{ enabled?: boolean }> = {},
) {
  return useQuery(getPublicSearchQueryOptions(query, coordinate, filters));
}

/** GPS and viewport query keys stay in memory under the publicSearch prefix. */
export function getPublicSearchQueryOptions(
  query: string,
  coordinate?: GeoCoordinate | null,
  filters: SearchFilters & Readonly<{ enabled?: boolean }> = {},
) {
  const normalizedQuery = query.trim();
  const bounds = isValidSearchBounds(filters.bounds) ? filters.bounds : null;
  return {
    queryKey: [
      ...queryKeys.publicSearch,
      normalizedQuery,
      coordinate?.latitude ?? null,
      coordinate?.longitude ?? null,
      filters.kind ?? null,
      bounds,
    ],
    queryFn: ({ signal }: Readonly<{signal: AbortSignal}>) =>
      searchPublicPlaces(normalizedQuery, coordinate, { signal, kind: filters.kind, bounds }),
    enabled: normalizedQuery.length >= 2 && filters.enabled !== false,
    staleTime: 60_000,
    retry: 1,
  };
}
