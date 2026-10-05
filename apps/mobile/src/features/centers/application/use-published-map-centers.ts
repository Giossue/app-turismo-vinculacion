import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoBoundingBox } from "@/core/geo/types";
import { isValidSearchBounds } from "@/features/search/domain/search-suggestion";
import { getPublishedMapCenters } from "../data/public-centers-api";
import { quantizeMapBounds } from "../domain/map-bounds-cell";
import type { CenterFilters, PublicCenter } from "../domain/public-center";

const emptyFilters: CenterFilters = {};

export function usePublishedMapCenters(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = emptyFilters,
) {
  const query = useQuery(getPublishedMapCentersQueryOptions(bounds, filters));
  const filterKey = JSON.stringify(filters);
  const [lastSuccess, setLastSuccess] = useState<{
    filterKey: string;
    data: readonly PublicCenter[];
  } | null>(null);

  // TanStack drops placeholderData if the new area fails. Keep the previous
  // successful snapshot in this mounted screen, with error/retry still visible.
  if (
    query.data !== undefined &&
    !query.isPlaceholderData &&
    (lastSuccess?.data !== query.data || lastSuccess.filterKey !== filterKey)
  ) {
    setLastSuccess({ filterKey, data: query.data });
  }

  return {
    ...query,
    data:
      query.data ??
      (lastSuccess?.filterKey === filterKey ? lastSuccess.data : undefined),
  };
}

/**
 * Only final camera boxes trigger requests; no GPS or persisted view history.
 * The box is snapped outward to a fixed grid so small pans inside the same
 * cells hit the cache instead of a new request; the fetched (expanded) area
 * always covers the camera box.
 */
export function getPublishedMapCentersQueryOptions(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = {},
) {
  const area = isValidSearchBounds(bounds)
    ? quantizeMapBounds({
        west: bounds[0],
        south: bounds[1],
        east: bounds[2],
        north: bounds[3],
      })
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
