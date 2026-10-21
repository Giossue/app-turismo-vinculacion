import { skipToken, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { getNearbyPlaces } from "../data/nearby-api";
import { toNearbyQueryPoint, type NearbyFilter } from "../domain/nearby-place";

export type NearbyPlacesOptions = Readonly<{
  filter?: NearbyFilter;
  limit?: number;
  radiusMeters?: number;
}>;

/**
 * Lugares publicados cerca de `coordinate`. Sin coordenada no consulta. Se
 * puede usar con la ubicación actual o con cualquier punto (por ejemplo, el
 * destino al que se acaba de llegar). La clave no se persiste: solo vive en
 * memoria, como el resto de resultados derivados del GPS.
 */
export function useNearbyPlaces(
  coordinate: GeoCoordinate | null,
  { filter = "all", limit, radiusMeters }: NearbyPlacesOptions = {},
) {
  const point = coordinate ? toNearbyQueryPoint(coordinate) : null;
  const query = point ? { ...point, filter, limit, radiusMeters } : null;
  return useQuery({
    queryKey: [...queryKeys.nearbyPlaces, query],
    queryFn: query
      ? ({ signal }) => getNearbyPlaces(query, { signal })
      : skipToken,
    staleTime: 60_000,
    retry: 1,
  });
}
