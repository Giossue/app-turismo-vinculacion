import type { GeoCoordinate } from "@/core/geo/types";
import type { RouteMode, RouteRequest } from "./routing";

/** Saved previews always use their stored route, including while online. */
export function getRemoteRouteRequest({
  saved,
  requested,
  origin,
  destination,
  mode,
}: Readonly<{
  saved: boolean;
  requested: boolean;
  origin: GeoCoordinate | null;
  destination: GeoCoordinate | null;
  mode: RouteMode;
}>): RouteRequest | null {
  return !saved && requested && origin && destination
    ? { origin, destination, mode }
    : null;
}

export const savedRouteNavigationNotice =
  "Ruta guardada: el GPS sigue tu avance. Si te desvías, vuelve al trazado; esta ruta no se recalcula.";
