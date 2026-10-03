import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoBoundingBox } from "@/core/geo/types";
import { isValidSearchBounds } from "@/features/search/domain/search-suggestion";
import { getPublishedMapCenters } from "../data/public-centers-api";
import type { CenterFilters } from "../domain/public-center";

export function usePublishedMapCenters(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = {},
) {
  return useQuery(getPublishedMapCentersQueryOptions(bounds, filters));
}

/** Only final camera boxes trigger requests; no GPS or persisted view history. */
export function getPublishedMapCentersQueryOptions(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = {},
) {
  const area = isValidSearchBounds(bounds)
    ? { west: bounds[0], south: bounds[1], east: bounds[2], north: bounds[3] }
    : null;
  return {
    queryKey: [...queryKeys.publishedMapCenters, filters, area],
    queryFn: ({ signal }: Readonly<{ signal: AbortSignal }>) =>
      area
        ? getPublishedMapCenters({ ...filters, bounds: area }, { signal })
        : Promise.resolve([]),
    enabled: area !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  };
}
