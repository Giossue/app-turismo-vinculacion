import { useQuery, useQueryClient } from "@tanstack/react-query";

import { withRequestSignal } from "@/core/api/http";
import { getLegalDocuments } from "../data/legal-api";

// Solo en memoria: fuera de `persistedQueryKeys`, para no aceptar un texto viejo.
const legalDocumentsQueryKey = ["legal-documents"] as const;

/**
 * Documentos vigentes para el registro, su lectura y la reaceptación. Sin red
 * falla enseguida, con reintento manual, en vez de quedar en pausa cargando.
 */
export function useLegalDocuments() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: legalDocumentsQueryKey,
    queryFn: ({ signal }) => getLegalDocuments(withRequestSignal(fetch, signal)),
    networkMode: "always",
    retry: false,
  });
  return {
    documents: query.data ?? null,
    failed: query.isError && !query.data,
    retrying: query.isFetching,
    retry: () => void query.refetch(),
    /** Descarta la copia actual: ya se sabe que no es la vigente. */
    reload: () =>
      void queryClient.resetQueries({ queryKey: legalDocumentsQueryKey }),
  };
}

export type LegalDocumentsState = ReturnType<typeof useLegalDocuments>;
