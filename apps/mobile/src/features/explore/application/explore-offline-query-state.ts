import { focusManager, onlineManager } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import type { GeoBoundingBox } from "@/core/geo/types";
import { offlineSummaryIntersects } from "@/features/offline/data/offline-summary";
import type {
  OfflineCityManifest,
  OfflineCitySummary,
} from "@/features/offline/domain/offline-city";
import type { ExploreMapFilter } from "../domain/explore-map-filter";
import { buildExploreOfflineMap } from "../domain/explore-offline-map";

export type ExploreOfflineNotice =
  | Readonly<{ kind: "no-downloads" }>
  | Readonly<{ kind: "downloaded" }>
  | Readonly<{ kind: "elsewhere"; bounds: GeoBoundingBox; cityName: string }>;

/**
 * Qué decirle a la persona sin conexión. El aviso no depende de que haya una
 * descarga, y si el mapa está en otra zona ofrece ir a la ciudad guardada.
 */
export function getExploreOfflineNotice(
  offline: boolean,
  summaries: readonly OfflineCitySummary[],
  area: GeoBoundingBox | null,
): ExploreOfflineNotice | null {
  if (!offline) return null;
  if (summaries.length === 0) return { kind: "no-downloads" };
  if (summaries.some((summary) => offlineSummaryIntersects(summary, area))) {
    return { kind: "downloaded" };
  }
  const [{ bounds, city, download }] = summaries;
  const cityBounds = download?.bounds ?? bounds;
  return cityBounds
    ? { kind: "elsewhere", bounds: cityBounds, cityName: city.name }
    : { kind: "downloaded" };
}

/** Sin conexión el mapa abre todas las descargas; una búsqueda sigue su área. */
export function getOfflineContentBounds(
  offline: boolean,
  searching: boolean,
  area: GeoBoundingBox | null,
): GeoBoundingBox | null {
  return offline && !searching ? null : area;
}

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
