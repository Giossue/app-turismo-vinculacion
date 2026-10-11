import { focusManager, onlineManager } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import type { ExploreMapFilter } from "../domain/explore-map-filter";
import { buildExploreOfflineMap } from "../domain/explore-offline-map";

/** Una consulta pausada al arrancar sin red también necesita las descargas. */
export function getExploreOfflineMap(
  query: Readonly<{ isPaused: boolean; isError: boolean; error: unknown }>,
  manifests: readonly OfflineCityManifest[],
  filter: ExploreMapFilter,
) {
  return query.isPaused || (query.isError && isApiUnavailableError(query.error))
    ? buildExploreOfflineMap(manifests, filter)
    : null;
}

/** Reintenta una API caída solo con la app visible y conexión disponible. */
export function startOfflineMapRetry(refetch: () => Promise<unknown>) {
  const timer = setInterval(() => {
    if (focusManager.isFocused() && onlineManager.isOnline()) {
      void refetch();
    }
  }, 30_000);
  return () => clearInterval(timer);
}
