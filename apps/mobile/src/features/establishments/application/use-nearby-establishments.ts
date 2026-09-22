import { skipToken, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getNearbyEstablishments } from "../data/establishments-api";
import type { NearbyEstablishmentsQuery } from "../domain/establishment";

export function useNearbyEstablishments(
  query: NearbyEstablishmentsQuery | null,
) {
  return useQuery({
    queryKey: [...queryKeys.nearbyEstablishments, query],
    queryFn: query
      ? ({ signal }) => getNearbyEstablishments(query, { signal })
      : skipToken,
    staleTime: 30_000,
    retry: 1,
  });
}
