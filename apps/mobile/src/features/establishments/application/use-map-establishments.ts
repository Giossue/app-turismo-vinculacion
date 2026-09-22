import { useQuery } from "@tanstack/react-query";

import { getMapEstablishments } from "../data/establishments-api";
import type {
  EstablishmentMapViewport,
  MapEstablishmentsResult,
} from "../domain/establishment";

export const mapEstablishmentsQueryKey = [
  "public-establishments-map",
  "osmic-pins-v1",
] as const;

export function useMapEstablishments(
  viewport: EstablishmentMapViewport | null,
) {
  return useQuery<MapEstablishmentsResult>({
    enabled: viewport !== null,
    placeholderData: (previous) => previous,
    queryKey: [...mapEstablishmentsQueryKey, viewport] as const,
    queryFn: ({ signal }) =>
      getMapEstablishments(viewport, fetch, undefined, signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
