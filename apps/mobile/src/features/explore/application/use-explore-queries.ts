import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import type { DiscoveryFilterValues } from "@/features/centers/presentation/discovery-filters";
import { useNearbyEstablishments } from "@/features/establishments/application/use-nearby-establishments";
import { usePublicSearch } from "@/features/search/application/use-public-search";
import type { SearchMode } from "@/features/search/presentation/search-mode-chips";
import {
  toggleMapFilter,
  type ExploreMapFilter,
} from "../domain/explore-map-filter";

/**
 * Remote data behind Explore: published centers (filtered by category and
 * the submitted text), national search, catalog and the nearby tourism
 * registry. Registry pins come as map tiles: here only their filter.
 */
export function useExploreQueries({
  mode,
  submittedQuery,
  userLocation,
}: Readonly<{
  mode: SearchMode;
  submittedQuery: string;
  userLocation: GeoCoordinate | null;
}>) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DiscoveryFilterValues>({});
  const [mapFilter, setMapFilter] = useState<ExploreMapFilter>(null);
  const centersQuery = usePublishedCenters({
    ...filters,
    text: mode === "CENTERS" ? submittedQuery || undefined : undefined,
  });
  const publicSearch = usePublicSearch(
    mode === "CENTERS" ? submittedQuery : "",
    null,
  );
  const catalog = useDiscoveryCatalog();
  const nearbyEstablishments = useNearbyEstablishments(
    mode === "ESTABLISHMENTS" && submittedQuery && userLocation
      ? {
          activity: submittedQuery,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }
      : null,
  );
  const centers = centersQuery.data ?? [];

  return {
    categories: catalog.data?.categories ?? [],
    centers,
    filters,
    mapFilter,
    /** Selects a map chip; selecting the active one shows everything again. */
    changeMapFilter: (next: ExploreMapFilter) =>
      setMapFilter((current) => toggleMapFilter(current, next)),
    /** Centers drawn on the map: hidden while a registry group is selected. */
    mapCenters: mapFilter?.kind === "establishments" ? [] : centers,
    /** Registry pins: hidden under Turismo, one group, or all of them. */
    establishmentLayer: {
      visible: mapFilter?.kind !== "tourism",
      group: mapFilter?.kind === "establishments" ? mapFilter.group : undefined,
    },
    nearbyEstablishments,
    publicSearch,
    /** Neither centers nor the national search answered: nothing to show. */
    failed:
      mode === "CENTERS" &&
      centersQuery.error !== null &&
      centers.length === 0 &&
      !publicSearch.data,
    isFetchingCenters: centersQuery.isFetching,
    isFetchingSearch: centersQuery.isFetching || publicSearch.isFetching,
    isRefreshingMap:
      mode === "CENTERS" && (centersQuery.isFetching || publicSearch.isFetching),
    searchError:
      centersQuery.error ?? (centers.length === 0 ? publicSearch.error : null),
    changeCategory: (categoryCode: string | undefined) => {
      setFilters((current) => ({
        ...current,
        categoryCode,
        typeCode: undefined,
        subtypeCode: undefined,
      }));
      if (categoryCode !== undefined) return;

      // "Todo" también funciona como actualización manual: invalida incluso
      // respuestas que todavía están dentro de su staleTime y conserva en el
      // mapa los datos actuales mientras llegan los nuevos.
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCenters }),
        queryClient.invalidateQueries({ queryKey: queryKeys.discoveryCatalog }),
      ]);
    },
    /** Retries every search source that failed, not only the centers. */
    retrySearch: () => {
      void centersQuery.refetch();
      if (publicSearch.isError) void publicSearch.refetch();
    },
  };
}
