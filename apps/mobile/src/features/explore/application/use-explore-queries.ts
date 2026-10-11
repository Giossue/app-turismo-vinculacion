import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { isApiUnavailableError } from "@/core/api/http";
import { quantizeMapBounds } from "@/features/centers/domain/map-bounds-cell";
import { offlineSummaryIntersects } from "@/features/offline/data/offline-summary";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedMapCenters } from "@/features/centers/application/use-published-map-centers";
import type { DiscoveryFilterValues } from "@/features/centers/presentation/discovery-filters";
import { useNearbyEstablishments } from "@/features/establishments/application/use-nearby-establishments";
import {
  useStoredOfflineCities,
  useStoredOfflineManifests,
} from "@/features/offline/application/use-stored-offline-cities";
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
import {
  getExploreOfflineMap,
  startOfflineMapRetry,
} from "./explore-offline-query-state";

/** Live search stays separate from the map catalog; typing never removes pins. */
export function useExploreQueries({
  active = true,
  mode,
  query,
  submittedQuery,
  userLocation,
  viewport = null,
  scope = "country",
}: Readonly<{
  active?: boolean;
  mode: SearchMode;
  query?: string;
  /** Compatibility for callers that have not adopted live search yet. */
  submittedQuery?: string;
  userLocation: GeoCoordinate | null;
  viewport?: SearchViewport | null;
  scope?: SearchScope;
}>) {
  const queryClient = useQueryClient();
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [filters, setFilters] = useState<DiscoveryFilterValues>({});
  const [mapFilter, setMapFilter] = useState<ExploreMapFilter>(null);
  const centersQuery = usePublishedMapCenters(
    viewport?.bounds ?? null,
    filters,
    active,
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
    enabled: active && hasQuery && currentQuery && areaAvailable,
  });
  // Kept for older result components. Unified search uses /search for services.
  const nearbyEstablishments = useNearbyEstablishments(null);
  const onlineUnavailable =
    hasQuery && currentQuery && (publicSearch.isError || publicSearch.isPaused);
  const needsOfflineMap =
    centersQuery.isPaused ||
    (!online && !centersQuery.isError) ||
    (centersQuery.isError && isApiUnavailableError(centersQuery.error));
  const contentArea = hasQuery ? searchFilters.bounds : viewport?.bounds;
  const localBounds = useMemo<GeoBoundingBox | null>(() => {
    if (!isValidSearchBounds(contentArea)) return null;
    const area = quantizeMapBounds({
      west: contentArea[0],
      south: contentArea[1],
      east: contentArea[2],
      north: contentArea[3],
    });
    return [area.west, area.south, area.east, area.north];
  }, [contentArea]);
  const content = useStoredOfflineManifests(
    active && ((hasQuery && areaAvailable) || needsOfflineMap),
    localBounds,
  );
  const offlineCoverage = useMemo(
    () =>
      stored.summaries
        .filter((summary) =>
          offlineSummaryIntersects(summary, searchFilters.bounds),
        )
        .map(({ city }) => ({ slug: city.slug, name: city.name })),
    [stored.summaries, searchFilters.bounds],
  );
  const suggestions = useMemo(
    () =>
      buildSearchSuggestions({
        query: areaAvailable ? normalizedQuery : "",
        manifests: areaAvailable ? content.manifests : [],
        onlineResults: currentQuery ? (publicSearch.data?.items ?? []) : [],
        coordinate,
        filters: searchFilters,
        onlineUnavailable,
        offlineCoverage,
      }),
    [
      areaAvailable,
      normalizedQuery,
      content.manifests,
      currentQuery,
      publicSearch.data,
      coordinate,
      searchFilters,
      onlineUnavailable,
      offlineCoverage,
    ],
  );
  // Without the API, the map draws the downloaded cities instead.
  const offlineMap = useMemo(
    () =>
      getExploreOfflineMap(
        {
          isPaused: needsOfflineMap,
          isError: centersQuery.isError,
          error: centersQuery.error,
        },
        content.manifests,
        mapFilter,
      ),
    [
      needsOfflineMap,
      centersQuery.isError,
      centersQuery.error,
      content.manifests,
      mapFilter,
    ],
  );
  const refetchCenters = centersQuery.refetch;
  useEffect(() => {
    if (!active || !offlineMap) return;
    return startOfflineMapRetry(refetchCenters);
  }, [active, offlineMap, refetchCenters]);
  const centers = centersQuery.data ?? [];
  const isSearching =
    hasQuery &&
    areaAvailable &&
    (!currentQuery || publicSearch.isFetching || content.isFetching);

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
      if (content.isError) void content.refetch();
    },
  };
}

function subscribeOnline(onChange: () => void) {
  return onlineManager.subscribe(onChange);
}
function getOnlineSnapshot() {
  return onlineManager.isOnline();
}
function getServerOnlineSnapshot() {
  return true;
}
