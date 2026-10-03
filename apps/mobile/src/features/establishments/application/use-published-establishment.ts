import { useQuery } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { getPublishedEstablishment } from "../data/establishments-api";

/**
 * Detail (photos) of a registry establishment. Pins without an id (offline
 * POIs, old manifests) do not query. Without a connection it does not retry:
 * the sheet keeps the map data and hides the photos quietly.
 */
export function usePublishedEstablishment(id: number | undefined) {
  return useQuery({
    queryKey: [...queryKeys.publishedEstablishment, id],
    queryFn: ({ signal }) => {
      if (id === undefined)
        throw new Error("Establecimiento sin identificador.");
      return getPublishedEstablishment(id, { signal });
    },
    enabled: id !== undefined,
    refetchOnMount: false,
    staleTime: 60_000,
    retry: (failureCount, error) =>
      failureCount < 1 && !isApiUnavailableError(error),
  });
}
