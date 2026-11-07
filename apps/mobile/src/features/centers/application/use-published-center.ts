import { queryOptions, useQuery } from "@tanstack/react-query";

import { isApiUnavailableError, withRequestSignal } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { getStoredOfflineCenter } from "@/features/offline/application/offline-fallback";
import { getPublishedCenter } from "../data/public-centers-api";
import type { PublicCenterDetail } from "../domain/public-center";

export function getPublishedCenterQueryOptions(code: string) {
  return queryOptions({
    queryKey: [...queryKeys.publishedCenter, code],
    queryFn: async ({ client, queryKey, signal }) => {
      try {
        return await getPublishedCenter(code, withRequestSignal(fetch, signal));
      } catch (error) {
        // Solo la falta de conexión usa la copia offline: un 404 significa
        // que el atractivo ya no está publicado y no debe revivirse.
        if (!isApiUnavailableError(error)) throw error;
        // La copia descargada no trae fotos ni dirección: no sustituye a una
        // ficha completa ya vista.
        const seen = client.getQueryData<PublicCenterDetail>(queryKey);
        if (seen) return seen;
        const cachedCenter = await getStoredOfflineCenter(code);
        if (!cachedCenter) throw error;
        return cachedCenter;
      }
    },
    enabled: Boolean(code),
    // La lectura inicial también debe poder alcanzar SQLite sin red.
    networkMode: "offlineFirst",
    // The saved copy shows at once; opening it after a minute refreshes it so
    // admin changes reach the sheet without reinstalling.
    staleTime: 60_000,
    retry: 1,
  });
}

export function usePublishedCenter(code: string) {
  return useQuery(getPublishedCenterQueryOptions(code));
}
