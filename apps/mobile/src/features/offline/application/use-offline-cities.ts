import { useQuery } from "@tanstack/react-query";

import { getOfflineCities } from "../data/offline-api";

export function useOfflineCities(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["offline-cities"],
    queryFn: () => getOfflineCities(),
    gcTime: 24 * 60 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
