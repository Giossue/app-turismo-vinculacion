import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { ApiError } from "./http";

const retiredStatuses: ReadonlySet<number | undefined> = new Set([
  403, 404, 410,
]);

/**
 * La API dijo que el registro ya no está publicado: se borra su copia. Si solo
 * se confiara en el error, un corte de red posterior lo reemplazaría y la ficha
 * volvería a mostrarse y a guardarse en disco.
 */
export function forgetRetiredRecord(
  client: QueryClient,
  queryKey: QueryKey,
  error: unknown,
): void {
  if (!(error instanceof ApiError) || !retiredStatuses.has(error.status))
    return;
  client
    .getQueryCache()
    .find({ queryKey })
    ?.setState({ data: undefined, dataUpdatedAt: 0 });
}
