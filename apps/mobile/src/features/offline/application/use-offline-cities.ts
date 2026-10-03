import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getOfflineCities } from "../data/offline-api";

/** Shared so the catalog can be prefetched before opening its screen. */
export const offlineCitiesQueryOptions = {
  queryKey: queryKeys.offlineCities,
  queryFn: () => getOfflineCities(),
  staleTime: 10 * 60 * 1000,
} as const;

export function useOfflineCities() {
  return useQuery(offlineCitiesQueryOptions);
}
