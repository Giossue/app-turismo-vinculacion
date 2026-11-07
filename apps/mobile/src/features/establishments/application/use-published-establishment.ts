import { queryOptions, useQuery } from "@tanstack/react-query";

import { forgetRetiredRecord } from "@/core/api/forget-retired-record";
import { isApiUnavailableError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { getStoredOfflineEstablishment } from "@/features/offline/application/offline-fallback";
import { getPublishedEstablishment } from "../data/establishments-api";
import { messages } from "@/core/i18n/language";

/**
 * Detail (photos) of a registry establishment. Pins without an id (offline
 * POIs, old manifests) do not query. Sin conexión usa la ficha ya vista o la
 * copia descargada, que no trae fotos.
 */
export function getPublishedEstablishmentQueryOptions(id: number | undefined) {
  return queryOptions({
    queryKey: [...queryKeys.publishedEstablishment, id],
    queryFn: async ({ client, queryKey, signal }) => {
      if (id === undefined)
        throw new Error(messages().places.establishment.missingIdError);
      try {
        return await getPublishedEstablishment(id, { signal });
      } catch (error) {
        // Un 404 significa que ya no está publicado: no se revive.
        if (!isApiUnavailableError(error)) {
          forgetRetiredRecord(client, queryKey, error);
          throw error;
        }
        // Fallar conserva la ficha ya vista con su fecha real; devolverla la
        // haría pasar por recién obtenida y saltaría el límite de 24 horas.
        if (client.getQueryData(queryKey)) throw error;
        const stored = await getStoredOfflineEstablishment(id);
        if (!stored) throw error;
        return stored;
      }
    },
    enabled: id !== undefined,
    // La lectura inicial también debe poder alcanzar las descargas sin red.
    networkMode: "offlineFirst",
    staleTime: 60_000,
    retry: (failureCount, error) =>
      failureCount < 1 && !isApiUnavailableError(error),
  });
}

export function usePublishedEstablishment(id: number | undefined) {
  return useQuery(getPublishedEstablishmentQueryOptions(id));
}
