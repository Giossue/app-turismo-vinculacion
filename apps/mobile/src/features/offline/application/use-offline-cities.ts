import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getOfflineCities } from "../data/offline-api";

export function useOfflineCities() {
  return useQuery({
    queryKey: queryKeys.offlineCities,
    queryFn: () => getOfflineCities(),
    staleTime: 10 * 60 * 1000,
  });
}
