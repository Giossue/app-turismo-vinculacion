import { useQuery } from "@tanstack/react-query";
import { getDiscoveryCatalog } from "../data/public-centers-api";
import { getStoredOfflineCenters } from "@/features/offline/application/offline-fallback";
import type { PublicCenter } from "../domain/public-center";

export const discoveryCatalogQueryKey = ["discovery-catalog"] as const;

export function useDiscoveryCatalog() {
  return useQuery({
    queryKey: discoveryCatalogQueryKey,
    queryFn: async () => {
      try {
        return await getDiscoveryCatalog();
      } catch (error) {
        const centers = await getStoredOfflineCenters();
        if (!centers.length) throw error;
        return catalogFromOfflineCenters(centers);
      }
    },
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    staleTime: 3_600_000,
    retry: 1,
  });
}

function catalogFromOfflineCenters(centers: readonly PublicCenter[]) {
  const unique = <T extends { code: string; name: string }>(
    values: readonly T[],
  ) =>
    [...new Map(values.map((value) => [value.code, value])).values()].sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  return {
    categories: unique(
      centers.map((center) => ({
        code: center.categoryCode,
        name: center.category,
      })),
    ),
    types: unique(
      centers.map((center) => ({
        categoryCode: center.categoryCode,
        code: center.typeCode,
        name: center.type,
      })),
    ),
    subtypes: unique(
      centers.map((center) => ({
        code: center.subtypeCode,
        name: center.subtype,
        typeCode: center.typeCode,
      })),
    ),
    provinces: unique(
      centers.map((center) => ({
        code: center.provinceCode,
        name: center.provinceCode,
      })),
    ),
    cantons: unique(
      centers.map((center) => ({
        code: center.cantonCode,
        name: center.cantonCode,
        provinceCode: center.provinceCode,
      })),
    ),
    parishes: unique(
      centers.map((center) => ({
        code: center.parishCode,
        name: center.parishCode,
        cantonCode: center.cantonCode,
      })),
    ),
    hierarchies: unique(
      centers
        .filter((center) => center.hierarchyCode && center.hierarchy)
        .map((center) => ({
          code: center.hierarchyCode!,
          name: center.hierarchy!,
        })),
    ),
  };
}
