import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPublishedCenters } from "../data/public-centers-api";
import type { CenterFilters } from "../domain/public-center";
import { getStoredOfflineCenters } from "@/features/offline/application/offline-fallback";

export const publishedCentersQueryKey = ["public-centers"] as const;

export function usePublishedCenters(filters: CenterFilters = {}) {
  return useQuery({
    queryKey: [...publishedCentersQueryKey, filters],
    queryFn: async () => {
      try {
        return await getPublishedCenters(filters);
      } catch (error) {
        const cachedCenters = await getStoredOfflineCenters();
        if (!cachedCenters.length) throw error;
        return filterOfflineCenters(cachedCenters, filters);
      }
    },
    placeholderData: keepPreviousData,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

function filterOfflineCenters(
  centers: readonly Awaited<ReturnType<typeof getPublishedCenters>>[number][],
  filters: CenterFilters,
) {
  const text = filters.text?.trim().toLocaleLowerCase();
  return centers.filter((center) => {
    const matchesText =
      !text ||
      [
        center.name,
        center.description,
        center.category,
        center.type,
        center.subtype,
      ]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(text));
    const matchesBounds =
      !filters.bounds ||
      (center.longitude >= filters.bounds.west &&
        center.longitude <= filters.bounds.east &&
        center.latitude >= filters.bounds.south &&
        center.latitude <= filters.bounds.north);
    return (
      matchesText &&
      matchesBounds &&
      (!filters.categoryCode || center.categoryCode === filters.categoryCode) &&
      (!filters.typeCode || center.typeCode === filters.typeCode) &&
      (!filters.subtypeCode || center.subtypeCode === filters.subtypeCode) &&
      (!filters.provinceCode || center.provinceCode === filters.provinceCode) &&
      (!filters.cantonCode || center.cantonCode === filters.cantonCode) &&
      (!filters.parishCode || center.parishCode === filters.parishCode) &&
      (!filters.hierarchyCode || center.hierarchyCode === filters.hierarchyCode)
    );
  });
}
