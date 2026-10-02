import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { listStoredOfflineManifests } from "../data/offline-storage";

/** Slugs of the cities whose manifest is stored on this device. */
export function useStoredOfflineCities() {
  const query = useQuery({
    queryKey: queryKeys.offlineStoredCities,
    queryFn: listStoredOfflineManifests,
    networkMode: "always",
    staleTime: 0,
  });
  return {
    ...query,
    data: query.data?.map((manifest) => manifest.city.slug),
    manifests: query.data ?? [],
  };
}
