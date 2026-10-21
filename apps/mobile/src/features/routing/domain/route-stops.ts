import type { GeoCoordinate } from "@/core/geo/types";
import { messages } from "@/core/i18n/language";
import { hasArrivedAtDestination } from "./navigation-guidance";
import type { CalculatedRoute } from "./routing";

/** Con el destino, un recorrido tiene hasta cinco paradas (límite de la API). */
export const maxRouteWaypoints = 4;

/** Parada intermedia de un recorrido, en orden de visita. */
export type RouteWaypoint = GeoCoordinate & Readonly<{ name: string }>;

/**
 * Índices de los pasos «arrive» de las paradas intermedias. OSRM termina cada
 * tramo con uno; el último es el destino y no se incluye.
 */
export function getStopArrivalStepIndexes(
  route: CalculatedRoute,
): readonly number[] {
  const arrivals = route.steps.flatMap((step, index) =>
    step.maneuver.type === "arrive" ? [index] : [],
  );
  return arrivals.slice(0, -1);
}

/**
 * Paradas con las que se pidió `route`: las últimas de `waypoints`, tantas
 * como llegadas intermedias tenga la ruta. Tras un recálculo la ruta solo
 * incluye las pendientes, así que no hace falta recordar desde cuál se pidió.
 */
export function getRouteStops<T extends GeoCoordinate>(
  route: CalculatedRoute | null,
  waypoints: readonly T[],
): readonly T[] {
  if (!route || waypoints.length === 0) return [];
  const count = getStopArrivalStepIndexes(route).length;
  return count === 0 ? [] : waypoints.slice(-count);
}

/**
 * Cuántas de las paradas pendientes se alcanzaron con esta posición, en orden.
 * Una parada cuenta al llegar a menos de la distancia de llegada o cuando la
 * guía ya pasó su paso «arrive» (por ejemplo, tras volver del segundo plano).
 *
 * `reachedOnRoute` son las paradas de esta misma ruta ya alcanzadas: la ruta
 * se pidió con las paradas pendientes de entonces, así que sus pasos «arrive»
 * siguen contando desde la primera.
 */
export function countReachedStops({
  coordinate,
  guidanceStepIndex,
  pendingStops,
  reachedOnRoute,
  route,
}: Readonly<{
  coordinate: GeoCoordinate;
  guidanceStepIndex: number | null;
  pendingStops: readonly GeoCoordinate[];
  reachedOnRoute: number;
  route: CalculatedRoute;
}>): number {
  const arrivalSteps = getStopArrivalStepIndexes(route);
  let reached = 0;
  for (const stop of pendingStops) {
    const arrivalStep = arrivalSteps[reachedOnRoute + reached];
    const passed =
      guidanceStepIndex !== null &&
      arrivalStep !== undefined &&
      guidanceStepIndex > arrivalStep;
    if (!passed && !hasArrivedAtDestination(coordinate, stop)) break;
    reached += 1;
  }
  return reached;
}

/** Aviso de la próxima parada pendiente durante la navegación. */
export function getNextStopNotice(
  pending: readonly RouteWaypoint[],
  total: number,
): string | null {
  const next = pending[0];
  if (!next) return null;
  return messages().routing.overlay.nextStop(
    total - pending.length + 1,
    total,
    next.name,
  );
}
