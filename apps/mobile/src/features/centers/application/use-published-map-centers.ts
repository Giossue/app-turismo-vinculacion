import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ApiError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoBoundingBox } from "@/core/geo/types";
import { isValidSearchBounds } from "@/features/search/domain/search-suggestion";
import {
  getPublishedMapCenters,
  getPublishedMapCenterPage,
} from "../data/public-centers-api";
import { quantizeMapBounds } from "../domain/map-bounds-cell";
import type { CenterFilters, PublicCenter } from "../domain/public-center";

const emptyFilters: CenterFilters = {};

export function usePublishedMapCenters(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = emptyFilters,
  active = true,
) {
  const filterKey = JSON.stringify(filters);
  const queryClient = useQueryClient();
  const area = getMapArea(bounds);
  const queryKey = [
    ...queryKeys.publishedMapCenters,
    "pages-v1",
    filters,
    area,
  ];
  const [verifyPage] = useState(createMapPageVerifier);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ signal, pageParam }) => {
      const page = await getPublishedMapCenterPage(
        { ...filters, bounds: area! },
        pageParam,
        { signal },
      );
      const previous =
        queryClient.getQueryData<
          InfiniteData<Awaited<ReturnType<typeof getPublishedMapCenterPage>>>
        >(queryKey);
      verifyPage(
        JSON.stringify(queryKey),
        page,
        previous?.pages
          .filter((entry) => entry.meta.offset < pageParam)
          .flatMap((entry) => entry.data) ?? [],
      );
      return page;
    },
    initialPageParam: 0,
    getNextPageParam: (page) => {
      const next = page.meta.offset + page.data.length;
      return next < page.meta.total ? next : undefined;
    },
    select: selectMapCenters,
    enabled: active && area !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
  const { fetchNextPage, hasNextPage, isFetching, isError, isPlaceholderData } =
    query;
  useEffect(() => {
    if (active && hasNextPage && !isFetching && !isError && !isPlaceholderData)
      void fetchNextPage();
  }, [
    active,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isError,
    isPlaceholderData,
  ]);
  const [lastSuccess, setLastSuccess] = useState<{
    filterKey: string;
    data: readonly PublicCenter[];
  } | null>(null);

  // TanStack drops placeholderData if the new area fails. Keep the previous
  // successful snapshot in this mounted screen, with error/retry still visible.
  if (
    query.data !== undefined &&
    !query.isPlaceholderData &&
    (lastSuccess?.data !== query.data || lastSuccess.filterKey !== filterKey)
  ) {
    setLastSuccess({ filterKey, data: query.data });
  }

  return {
    ...query,
    data:
      query.data ??
      (lastSuccess?.filterKey === filterKey ? lastSuccess.data : undefined),
  };
}

/**
 * Only final camera boxes trigger requests; no GPS or persisted view history.
 * The box is snapped outward to a fixed grid so small pans inside the same
 * cells hit the cache instead of a new request; the fetched (expanded) area
 * always covers the camera box.
 */
export function getPublishedMapCentersQueryOptions(
  bounds: GeoBoundingBox | null,
  filters: CenterFilters = {},
) {
  const area = getMapArea(bounds);
  return {
    queryKey: [...queryKeys.publishedMapCenters, filters, area],
    queryFn: ({ signal }: Readonly<{ signal: AbortSignal }>) =>
      area
        ? getPublishedMapCenters({ ...filters, bounds: area }, { signal })
        : Promise.resolve([]),
    enabled: area !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  };
}

function getMapArea(bounds: GeoBoundingBox | null) {
  return isValidSearchBounds(bounds)
    ? quantizeMapBounds({
        west: bounds[0],
        south: bounds[1],
        east: bounds[2],
        north: bounds[3],
      })
    : null;
}

function selectMapCenters(
  result: InfiniteData<Awaited<ReturnType<typeof getPublishedMapCenterPage>>>,
) {
  const centers = new Map<string, PublicCenter>();
  for (const page of result.pages)
    for (const center of page.data) centers.set(center.code, center);
  return [...centers.values()];
}

/** El verificador pertenece al transporte y conserva solo la secuencia actual. */
function createMapPageVerifier() {
  let areaKey: string | null = null;
  let seen = new Set<string>();
  return (
    key: string,
    page: Awaited<ReturnType<typeof getPublishedMapCenterPage>>,
    previous: readonly PublicCenter[],
  ) => {
    if (key !== areaKey || page.meta.offset === 0) {
      areaKey = key;
      seen = new Set(
        page.meta.offset === 0 ? [] : previous.map((center) => center.code),
      );
    }
    if (
      page.meta.offset > 0 &&
      page.data.length > 0 &&
      page.data.every((center) => seen.has(center.code))
    )
      throw new ApiError(
        "No fue posible completar los atractivos de esta zona.",
      );
    for (const center of page.data) seen.add(center.code);
  };
}
