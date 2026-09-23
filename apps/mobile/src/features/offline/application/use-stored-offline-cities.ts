import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { listStoredOfflineCities } from "../data/offline-storage";

/** Slugs of the cities whose manifest is stored on this device. */
export function useStoredOfflineCities(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.offlineStoredCities,
    queryFn: listStoredOfflineCities,
    staleTime: 0,
  });
}
