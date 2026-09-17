import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPublishedCenters } from "../data/public-centers-api";
import type { CenterFilters } from "../domain/public-center";

export const publishedCentersQueryKey = ["public-centers"] as const;

export function usePublishedCenters(filters: CenterFilters = {}) {
  return useQuery({
    queryKey: [...publishedCentersQueryKey, filters],
    queryFn: () => getPublishedCenters(filters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  });
}
