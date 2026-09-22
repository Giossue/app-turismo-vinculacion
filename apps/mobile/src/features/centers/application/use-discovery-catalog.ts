import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { getStoredOfflineCenters } from "@/features/offline/application/offline-fallback";
import { getDiscoveryCatalog } from "../data/public-centers-api";
import type { DiscoveryCatalog, PublicCenter } from "../domain/public-center";
import { uniqueByCode } from "../domain/unique-by-code";

export function useDiscoveryCatalog() {
  return useQuery({
    queryKey: queryKeys.discoveryCatalog,
    queryFn: async () => {
      try {
        return await getDiscoveryCatalog();
      } catch (error) {
        const centers = await getStoredOfflineCenters();
        if (!centers.length) throw error;
        return catalogFromOfflineCenters(centers);
      }
    },
    refetchOnMount: false,
    staleTime: 3_600_000,
    retry: 1,
  });
}

/**
 * Builds the filters available offline from the stored centers. The manifest
 * only carries DPA codes, so provinces, cantons and parishes are left empty
 * instead of showing raw codes as names; consumers already handle that.
 */
function catalogFromOfflineCenters(
  centers: readonly PublicCenter[],
): DiscoveryCatalog {
  const sorted = { sortByName: true };
  return {
    categories: uniqueByCode(
      centers.map((center) => ({
        code: center.categoryCode,
        name: center.category,
      })),
      sorted,
    ),
    types: uniqueByCode(
      centers.map((center) => ({
        categoryCode: center.categoryCode,
        code: center.typeCode,
        name: center.type,
      })),
      sorted,
    ),
    subtypes: uniqueByCode(
      centers.map((center) => ({
        code: center.subtypeCode,
        name: center.subtype,
        typeCode: center.typeCode,
      })),
      sorted,
    ),
    provinces: [],
    cantons: [],
    parishes: [],
    hierarchies: uniqueByCode(
      centers.flatMap((center) =>
        center.hierarchyCode && center.hierarchy
          ? [{ code: center.hierarchyCode, name: center.hierarchy }]
          : [],
      ),
      sorted,
    ),
  };
}
