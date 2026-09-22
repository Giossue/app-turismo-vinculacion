import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getPublishedCenters } from "../data/public-centers-api";
import type { CenterFilters } from "../domain/public-center";

export function usePublishedCenters(filters: CenterFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.publishedCenters, filters],
    // El mapa en línea debe reflejar únicamente lo que la API institucional
    // devuelve ahora. Los manifiestos offline tienen su propio flujo y no
    // pueden introducir pines en Explorar.
    queryFn: () => getPublishedCenters(filters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
