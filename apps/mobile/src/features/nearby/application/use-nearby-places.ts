import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { getStoredOfflineNearbyPlaces } from "@/features/offline/application/offline-fallback";
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
 * memoria, como el resto de resultados derivados del GPS. Sin conexión calcula
 * los lugares con las ciudades descargadas.
 */
export function getNearbyPlacesQueryOptions(
  coordinate: GeoCoordinate | null,
  { filter = "all", limit, radiusMeters }: NearbyPlacesOptions = {},
) {
  const point = coordinate ? toNearbyQueryPoint(coordinate) : null;
  const query = point ? { ...point, filter, limit, radiusMeters } : null;
  return queryOptions({
    queryKey: [...queryKeys.nearbyPlaces, query],
    queryFn: query
      ? async ({ signal }) => {
          try {
            return await getNearbyPlaces(query, { signal });
          } catch (error) {
            if (!isApiUnavailableError(error)) throw error;
            const stored = await getStoredOfflineNearbyPlaces(query);
            if (!stored) throw error;
            return stored;
          }
        }
      : skipToken,
    // La lectura inicial también debe poder alcanzar las descargas sin red.
    networkMode: "offlineFirst",
    staleTime: 60_000,
    retry: 1,
  });
}

export function useNearbyPlaces(
  coordinate: GeoCoordinate | null,
  options: NearbyPlacesOptions = {},
) {
  return useQuery(getNearbyPlacesQueryOptions(coordinate, options));
}
