import { useQuery } from "@tanstack/react-query";

import { searchPublicPlaces } from "../data/search-api";

export const publicSearchQueryKey = ["public-search"] as const;

export function usePublicSearch(
  query: string,
  coordinate?: { latitude: number; longitude: number } | null,
) {
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: [
      ...publicSearchQueryKey,
      normalizedQuery,
      coordinate?.latitude ?? null,
      coordinate?.longitude ?? null,
    ],
    queryFn: ({ signal }) =>
      searchPublicPlaces(normalizedQuery, coordinate, fetch, undefined, signal),
    enabled: normalizedQuery.length >= 2,
    staleTime: 60_000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
