import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoBounds } from "@/core/geo/types";
import { getMapEstablishments } from "../data/establishments-api";
import type { MapEstablishmentsResult } from "../domain/establishment";

// ~110 m: small camera movements reuse the cached viewport instead of creating
// a new query for every sub-meter change in the visible bounds.
const viewportPrecision = 1_000;

export function useMapEstablishments(viewport: GeoBounds | null) {
  const roundedViewport = viewport ? roundViewportOutward(viewport) : null;
  return useQuery<MapEstablishmentsResult>({
    enabled: roundedViewport !== null,
    placeholderData: (previous) => previous,
    queryKey: [...queryKeys.mapEstablishments, roundedViewport],
    queryFn: ({ signal }) => getMapEstablishments(roundedViewport, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Rounds the bounds outward so the request always covers the visible area. */
function roundViewportOutward(viewport: GeoBounds): GeoBounds {
  return {
    west: Math.floor(viewport.west * viewportPrecision) / viewportPrecision,
    south: Math.floor(viewport.south * viewportPrecision) / viewportPrecision,
    east: Math.ceil(viewport.east * viewportPrecision) / viewportPrecision,
    north: Math.ceil(viewport.north * viewportPrecision) / viewportPrecision,
  };
}
