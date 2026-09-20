import { useQuery } from "@tanstack/react-query";

import { getNearbyEstablishments } from "../data/establishments-api";
import type { NearbyEstablishmentsQuery } from "../domain/establishment";

export function useNearbyEstablishments(
  query: NearbyEstablishmentsQuery | null,
) {
  return useQuery({
    queryKey: ["nearby-establishments", query],
    queryFn: ({ signal }) =>
      getNearbyEstablishments(query!, fetch, undefined, signal),
    enabled: query !== null,
    staleTime: 30_000,
    retry: 1,
  });
}
