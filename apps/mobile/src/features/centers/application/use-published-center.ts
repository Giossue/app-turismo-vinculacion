import { useQuery } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { getStoredOfflineCenter } from "@/features/offline/application/offline-fallback";
import { getPublishedCenter } from "../data/public-centers-api";

export function usePublishedCenter(code: string) {
  return useQuery({
    queryKey: [...queryKeys.publishedCenter, code],
    queryFn: async () => {
      try {
        return await getPublishedCenter(code);
      } catch (error) {
        // Solo la falta de conexión usa la copia offline: un 404 significa
        // que el atractivo ya no está publicado y no debe revivirse.
        if (!isApiUnavailableError(error)) throw error;
        const cachedCenter = await getStoredOfflineCenter(code);
        if (!cachedCenter) throw error;
        return cachedCenter;
      }
    },
    enabled: Boolean(code),
    refetchOnMount: false,
    staleTime: 60_000,
    retry: 1,
  });
}
