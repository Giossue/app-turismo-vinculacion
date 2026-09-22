import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { searchPublicPlaces } from "../data/search-api";

export function usePublicSearch(
  query: string,
  coordinate?: GeoCoordinate | null,
) {
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: [
      ...queryKeys.publicSearch,
      normalizedQuery,
      coordinate?.latitude ?? null,
      coordinate?.longitude ?? null,
    ],
    queryFn: ({ signal }) =>
      searchPublicPlaces(normalizedQuery, coordinate, { signal }),
    enabled: normalizedQuery.length >= 2,
    staleTime: 60_000,
    retry: 1,
  });
}
