import type { Href } from "expo-router";

import {
  maxRouteWaypoints,
  type RouteWaypoint,
} from "@/features/routing/domain/route-stops";
import type { RouteMode } from "@/features/routing/domain/routing";
import {
  buildRouteHref,
  type RoutePlace,
} from "@/features/routing/presentation/route-href";

/** Paradas intermedias más el destino final. */
export const maxTripStops = maxRouteWaypoints + 1;

/** Lugar del catálogo dentro del recorrido, en orden de visita. */
export type TripStop = RouteWaypoint &
  Readonly<{
    /** Identifica el lugar para no repetirlo: `center:<código>` o `establishment:<id>`. */
    key: string;
    place: RoutePlace;
  }>;

export type AddTripStopResult = Readonly<{
  outcome: "added" | "duplicate" | "full";
  stops: readonly TripStop[];
}>;

export function getTripStopKey(place: RoutePlace): string {
  return place.kind === "center"
    ? `center:${place.code}`
    : `establishment:${place.id}`;
}

/** Agrega al final; un lugar repetido o un recorrido lleno no cambian nada. */
export function addTripStop(
  stops: readonly TripStop[],
  stop: TripStop,
): AddTripStopResult {
  if (stops.some((item) => item.key === stop.key)) {
    return { outcome: "duplicate", stops };
  }
  if (stops.length >= maxTripStops) return { outcome: "full", stops };
  return { outcome: "added", stops: [...stops, stop] };
}

export function removeTripStop(
  stops: readonly TripStop[],
  key: string,
): readonly TripStop[] {
  return stops.filter((stop) => stop.key !== key);
}

/** Mueve una parada un lugar antes (`-1`) o después (`1`); en el borde no cambia. */
export function moveTripStop(
  stops: readonly TripStop[],
  key: string,
  offset: -1 | 1,
): readonly TripStop[] {
  const index = stops.findIndex((stop) => stop.key === key);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= stops.length) return stops;
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * «Cómo llegar» del recorrido: la última parada es el destino (con sus
 * acciones de llegada) y las anteriores, paradas intermedias. Sin paradas no
 * hay ruta.
 */
export function buildTripRouteHref(
  stops: readonly TripStop[],
  mode?: RouteMode,
): Href | null {
  const destination = stops.at(-1);
  if (!destination) return null;
  const waypoints = stops
    .slice(0, -1)
    .map(({ latitude, longitude, name }) => ({ latitude, longitude, name }));
  return buildRouteHref(
    {
      latitude: destination.latitude,
      longitude: destination.longitude,
      name: destination.name,
      place: destination.place,
    },
    mode,
    waypoints,
  );
}

export function buildCenterTripStop(
  center: Readonly<{
    code: string;
    latitude: number;
    longitude: number;
    name: string;
  }>,
): TripStop {
  const place: RoutePlace = { kind: "center", code: center.code };
  return {
    key: getTripStopKey(place),
    latitude: center.latitude,
    longitude: center.longitude,
    name: center.name,
    place,
  };
}

/** Sin id del catastro o sin coordenadas el establecimiento no entra al recorrido. */
export function buildEstablishmentTripStop(
  establishment: Readonly<{
    id: number | undefined;
    latitude: number | null;
    longitude: number | null;
    name: string;
  }>,
): TripStop | null {
  const { id, latitude, longitude, name } = establishment;
  if (id === undefined || latitude === null || longitude === null) return null;
  const place: RoutePlace = { kind: "establishment", id };
  return { key: getTripStopKey(place), latitude, longitude, name, place };
}
