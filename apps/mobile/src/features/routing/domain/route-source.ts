import type { GeoCoordinate } from "@/core/geo/types";
import type { RouteMode, RouteRequest } from "./routing";
import { messages } from "@/core/i18n/language";

/** Saved previews always use their stored route, including while online. */
export function getRemoteRouteRequest({
  saved,
  requested,
  origin,
  destination,
  mode,
  waypoints = [],
}: Readonly<{
  saved: boolean;
  requested: boolean;
  origin: GeoCoordinate | null;
  destination: GeoCoordinate | null;
  mode: RouteMode;
  /** Paradas pendientes del recorrido, sin el destino. */
  waypoints?: readonly GeoCoordinate[];
}>): RouteRequest | null {
  if (saved || !requested || !origin || !destination) return null;
  return waypoints.length > 0
    ? {
        origin,
        // Solo coordenadas: los nombres de las paradas no salen del teléfono.
        waypoints: waypoints.map(({ latitude, longitude }) => ({
          latitude,
          longitude,
        })),
        destination,
        mode,
      }
    : { origin, destination, mode };
}

export function getSavedRouteNavigationNotice(): string {
  return messages().routing.screen.savedNotice;
}
