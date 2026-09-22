import { skipToken, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { calculateRoute } from "../data/routing-api";
import type { RouteRequest } from "../domain/routing";

export function useCalculatedRoute(request: RouteRequest | null) {
  return useQuery({
    queryKey: [...queryKeys.calculatedRoute, request],
    queryFn: request
      ? ({ signal }) => calculateRoute(request, { signal })
      : skipToken,
    // Cada origen GPS crea una clave nueva; no conservar rutas viejas un día.
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    retry: false,
    staleTime: 0,
  });
}
