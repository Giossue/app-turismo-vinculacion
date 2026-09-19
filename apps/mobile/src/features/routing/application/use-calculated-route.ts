import { useQuery } from "@tanstack/react-query";

import { calculateRoute } from "../data/routing-api";
import type { RouteRequest } from "../domain/routing";

export function useCalculatedRoute(request: RouteRequest | null) {
  return useQuery({
    queryKey: ["calculated-route", request],
    queryFn: ({ signal }) => calculateRoute(request!, fetch, undefined, signal),
    enabled: request !== null,
    retry: false,
    staleTime: 0,
  });
}
