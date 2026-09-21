import { useQuery } from "@tanstack/react-query";

import { getPublishedCenters } from "../data/public-centers-api";
import type { CenterFilters } from "../domain/public-center";

// Cambiar la versión descarta la consulta persistida de la etapa en la que el
// mapa podía usar centros offline como respaldo.
export const publishedCentersQueryKey = [
  "public-centers",
  "remote-authoritative-v1",
] as const;

export function usePublishedCenters(filters: CenterFilters = {}) {
  return useQuery({
    queryKey: [...publishedCentersQueryKey, filters],
    // El mapa en línea debe reflejar únicamente lo que la API institucional
    // devuelve ahora. Los manifiestos offline tienen su propio flujo y no
    // pueden introducir pines en Explorar.
    queryFn: () => getPublishedCenters(filters),
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
