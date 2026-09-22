import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getOfflineCities } from "../data/offline-api";

export function useOfflineCities(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.offlineCities,
    queryFn: () => getOfflineCities(),
    staleTime: 10 * 60 * 1000,
  });
}
