import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { isApiUnavailableError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoCoordinate } from "@/core/geo/types";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedMapCenters } from "@/features/centers/application/use-published-map-centers";
import type { DiscoveryFilterValues } from "@/features/centers/presentation/discovery-filters";
import { useNearbyEstablishments } from "@/features/establishments/application/use-nearby-establishments";
import { useStoredOfflineCities } from "@/features/offline/application/use-stored-offline-cities";
import { useDebouncedSearchText } from "@/features/search/application/use-debounced-search-text";
import { usePublicSearch } from "@/features/search/application/use-public-search";
import { buildSearchSuggestions } from "@/features/search/data/offline-search";
import {
  isValidSearchBounds,
  type SearchFilters,
  type SearchScope,
  type SearchViewport,
} from "@/features/search/domain/search-suggestion";
import type { SearchMode } from "@/features/search/presentation/search-mode-chips";
import {
  toggleMapFilter,
  type ExploreMapFilter,
} from "../domain/explore-map-filter";
import { buildExploreOfflineMap } from "../domain/explore-offline-map";

/** While offline, how often the map checks whether the API is back. */
const offlineRetryMs = 30_000;

/** Live search stays separate from the map catalog; typing never removes pins. */
export function useExploreQueries({
  mode,
  query,
  submittedQuery,
  userLocation,
  viewport = null,
  scope = "country",
}: Readonly<{
  mode: SearchMode;
  query?: string;
  /** Compatibility for callers that have not adopted live search yet. */
  submittedQuery?: string;
  userLocation: GeoCoordinate | null;
  viewport?: SearchViewport | null;
  scope?: SearchScope;
}>) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DiscoveryFilterValues>({});
  const [mapFilter, setMapFilter] = useState<ExploreMapFilter>(null);
  const centersQuery = usePublishedMapCenters(
    viewport?.bounds ?? null,
    filters,
  );
  const catalog = useDiscoveryCatalog();
  const stored = useStoredOfflineCities();
  const normalizedQuery = (query ?? submittedQuery ?? "").trim();
  const debouncedQuery = useDebouncedSearchText(normalizedQuery);
  const hasQuery = normalizedQuery.length >= 2;
  const currentQuery = normalizedQuery === debouncedQuery;
  const areaAvailable =
    scope !== "area" || isValidSearchBounds(viewport?.bounds);
  const searchFilters = useMemo<SearchFilters>(
    () => ({
      kind:
        mode === "CENTERS"
          ? "center"
          : mode === "ESTABLISHMENTS"
            ? "establishment"
            : mode === "GEOGRAPHIC"
              ? "geographic"
              : undefined,
      bounds:
        scope === "area" && isValidSearchBounds(viewport?.bounds)
          ? viewport.bounds
          : null,
    }),
    [mode, scope, viewport?.bounds],
  );
  // Existing foreground location is optional; browsing never requests GPS.
  const coordinate = userLocation ?? viewport?.center ?? null;
  const publicSearch = usePublicSearch(debouncedQuery, coordinate, {
    ...searchFilters,
    enabled: hasQuery && currentQuery && areaAvailable,
  });
  // Kept for older result components. Unified search uses /search for services.
  const nearbyEstablishments = useNearbyEstablishments(null);
  const onlineUnavailable =
    hasQuery && currentQuery && (publicSearch.isError || publicSearch.isPaused);
  const suggestions = useMemo(
    () =>
      buildSearchSuggestions({
        query: areaAvailable ? normalizedQuery : "",
        manifests: areaAvailable ? stored.manifests : [],
        onlineResults: currentQuery ? (publicSearch.data?.items ?? []) : [],
        coordinate,
        filters: searchFilters,
        onlineUnavailable,
      }),
    [
      areaAvailable,
      normalizedQuery,
      stored.manifests,
      currentQuery,
      publicSearch.data,
      coordinate,
      searchFilters,
      onlineUnavailable,
    ],
  );
  // Without the API, the map draws the downloaded cities instead.
  const offlineMap = useMemo(
    () =>
      centersQuery.isError && isApiUnavailableError(centersQuery.error)
        ? buildExploreOfflineMap(stored.manifests, mapFilter)
        : null,
    [centersQuery.isError, centersQuery.error, stored.manifests, mapFilter],
  );
  const refetchCenters = centersQuery.refetch;
  useEffect(() => {
    if (!offlineMap) return;
    const timer = setInterval(() => void refetchCenters(), offlineRetryMs);
    return () => clearInterval(timer);
  }, [offlineMap, refetchCenters]);
  const centers = centersQuery.data ?? [];
  const isSearching =
    hasQuery && areaAvailable && (!currentQuery || publicSearch.isFetching);

  return {
    categories: catalog.data?.categories ?? [],
    centers,
    filters,
    mapFilter,
    changeMapFilter: (next: ExploreMapFilter) =>
      setMapFilter((current) => toggleMapFilter(current, next)),
    mapCenters: offlineMap
      ? offlineMap.centers
      : mapFilter?.kind === "establishments"
        ? []
        : centers,
    offlineMap,
    establishmentLayer: {
      visible: mapFilter?.kind !== "tourism",
      group: mapFilter?.kind === "establishments" ? mapFilter.group : undefined,
    },
    nearbyEstablishments,
    publicSearch,
    ...suggestions,
    onlineUnavailable,
    isSearching,
    failed:
      hasQuery && onlineUnavailable && suggestions.searchItems.length === 0,
    isFetchingCenters: centersQuery.isFetching,
    isFetchingSearch: isSearching,
    isRefreshingMap: centersQuery.isFetching,
    mapError: centersQuery.error,
    retryMap: () => void centersQuery.refetch(),
    searchError: hasQuery && currentQuery ? publicSearch.error : null,
    changeCategory: (categoryCode: string | undefined) => {
      setFilters((current) => ({
        ...current,
        categoryCode,
        typeCode: undefined,
        subtypeCode: undefined,
      }));
      if (categoryCode !== undefined) return;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCenters }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.publishedMapCenters,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.discoveryCatalog }),
      ]);
    },
    retrySearch: () => {
      if (hasQuery && currentQuery && areaAvailable)
        void publicSearch.refetch();
      if (stored.isError) void stored.refetch();
    },
  };
}
