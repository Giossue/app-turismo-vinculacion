import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoBounds } from "@/core/geo/types";
import { getMapEstablishments } from "../data/establishments-api";
import type { MapEstablishmentsResult } from "../domain/establishment";
import type { EstablishmentMapGroup } from "../domain/establishment-groups";

// ~110 m: small camera movements reuse the cached viewport instead of creating
// a new query for every sub-meter change in the visible bounds.
const viewportPrecision = 1_000;

/**
 * Pins of the tourism registry in the viewport, optionally only one `group`.
 * `enabled: false` skips the request (e.g. while the map shows only centers).
 */
export function useMapEstablishments(
  viewport: GeoBounds | null,
  {
    enabled = true,
    group,
  }: Readonly<{ enabled?: boolean; group?: EstablishmentMapGroup }> = {},
) {
  const roundedViewport = viewport ? roundViewportOutward(viewport) : null;
  return useQuery<MapEstablishmentsResult>({
    enabled: enabled && roundedViewport !== null,
    placeholderData: (previous) => previous,
    queryKey: [...queryKeys.mapEstablishments, roundedViewport, group ?? null],
    queryFn: ({ signal }) =>
      getMapEstablishments(roundedViewport, { group, signal }),
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
