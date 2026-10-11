import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { prepareOfflineSearchIndex } from "@/features/search/data/offline-search-index";
import { offlineSummaryIntersects } from "../data/offline-summary";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoBoundingBox } from "@/core/geo/types";
import type {
  OfflineCityManifest,
  OfflineCitySummary,
} from "../domain/offline-city";
import {
  getStoredOfflineManifest,
  listStoredOfflineSummaries,
} from "../data/offline-storage";

const emptySummaries: readonly OfflineCitySummary[] = [];
const emptyManifests: readonly OfflineCityManifest[] = [];

export function useStoredOfflineCities() {
  const query = useQuery({
    queryKey: queryKeys.offlineStoredCities,
    queryFn: listStoredOfflineSummaries,
    networkMode: "always",
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
  return {
    ...query,
    data: query.data?.map(({ city }) => city.slug),
    summaries: query.data ?? emptySummaries,
  };
}

/** El contenido se abre solo para buscar o dibujar el mapa sin conexión. */
export function useStoredOfflineManifests(
  enabled: boolean,
  bounds?: GeoBoundingBox | null,
) {
  const stored = useStoredOfflineCities();
  const queries = useQueries({
    queries: enabled
      ? stored.summaries
          .filter((summary) => offlineSummaryIntersects(summary, bounds))
          .map(({ city }) => ({
            queryKey: [...queryKeys.offlineStoredCities, "content", city.slug],
            queryFn: async ({ signal }: { signal: AbortSignal }) => {
              const manifest = await getStoredOfflineManifest(city.slug);
              if (manifest) await prepareOfflineSearchIndex(manifest, signal);
              return manifest;
            },
            networkMode: "always" as const,
            staleTime: Infinity,
            gcTime: 5 * 60_000,
            structuralSharing: false,
          }))
      : [],
  });
  // Mantener la identidad preparada: compartir recursivamente el JSON construiría
  // otro objeto y obligaría a reconstruir su índice en el hilo de interfaz.
  const loaded = queries.flatMap((query) => (query.data ? [query.data] : []));
  const [manifests, setManifests] = useState(emptyManifests);
  if (
    manifests.length !== loaded.length ||
    loaded.some((manifest, index) => manifest !== manifests[index])
  )
    setManifests(loaded);
  return {
    manifests,
    isFetching:
      enabled &&
      (stored.isFetching || queries.some((query) => query.isFetching)),
    isError: stored.isError || queries.some((query) => query.isError),
    refetch: () =>
      Promise.all([
        stored.refetch(),
        ...queries.map((query) => query.refetch()),
      ]),
  };
}
