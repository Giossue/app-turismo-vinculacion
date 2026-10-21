import type { Href } from "expo-router";

import type { GeoCoordinate } from "@/core/geo/types";
import {
  firstSearchParam,
  parseCoordinateParams,
  sanitizeTextParam,
  type SearchParamValue,
} from "@/core/navigation/search-params";
import { z } from "zod";

import { maxRouteWaypoints, type RouteWaypoint } from "../domain/route-stops";
import { isRouteMode, type RouteMode } from "../domain/routing";
import { messages } from "@/core/i18n/language";

/** El nombre puede llegar en un enlace compartido; se limita su longitud. */
export const destinationNameMaxLength = 120;

/** Lugar del catálogo al que lleva la ruta; habilita sus acciones al llegar. */
export type RoutePlace = Readonly<
  { kind: "center"; code: string } | { kind: "establishment"; id: number }
>;

export type RouteDestination = GeoCoordinate &
  Readonly<{ name: string; place?: RoutePlace | null }>;

export type RouteSearchParams = Readonly<{
  destinationLatitude?: SearchParamValue;
  destinationLongitude?: SearchParamValue;
  destinationName?: SearchParamValue;
  mode?: SearchParamValue;
  placeId?: SearchParamValue;
  placeKind?: SearchParamValue;
  savedRouteKey?: SearchParamValue;
  waypoints?: SearchParamValue;
}>;

export type ParsedRouteSearchParams = Readonly<{
  destination: GeoCoordinate | null;
  destinationName: string;
  mode: RouteMode;
  place: RoutePlace | null;
  savedRouteKey: string | null;
  /** Paradas intermedias de un recorrido, en orden; vacío en rutas simples. */
  waypoints: readonly RouteWaypoint[];
}>;

/**
 * Opens the route preview towards `destination`, optionally in a mode and
 * passing first through the trip `waypoints`, in order.
 */
export function buildRouteHref(
  destination: RouteDestination,
  mode?: RouteMode,
  waypoints: readonly RouteWaypoint[] = [],
): Href {
  return {
    pathname: "/route",
    params: {
      destinationLatitude: String(destination.latitude),
      destinationLongitude: String(destination.longitude),
      destinationName: destination.name,
      ...(mode ? { mode } : {}),
      ...(waypoints.length > 0
        ? { waypoints: serializeRouteWaypoints(waypoints) }
        : {}),
      ...(destination.place
        ? {
            placeKind: destination.place.kind,
            placeId:
              destination.place.kind === "center"
                ? destination.place.code
                : String(destination.place.id),
          }
        : {}),
    },
  };
}

/** Opens the local preview; loading it never requests a new route or GPS. */
export function buildSavedRouteHref(savedRouteKey: string): Href {
  return { pathname: "/route", params: { savedRouteKey } };
}

/** Reads the params written by `buildRouteHref`, with safe defaults. */
export function parseRouteSearchParams(
  params: RouteSearchParams,
): ParsedRouteSearchParams {
  return {
    destination: parseRouteDestination(
      params.destinationLatitude,
      params.destinationLongitude,
    ),
    destinationName:
      sanitizeTextParam(params.destinationName, destinationNameMaxLength) ??
      messages().routing.screen.defaultDestination,
    mode: parseRouteMode(params.mode) ?? "car",
    place: parseRoutePlace(params.placeKind, params.placeId),
    savedRouteKey: firstSearchParam(params.savedRouteKey) || null,
    waypoints: parseRouteWaypoints(params.waypoints),
  };
}

const waypointTupleSchema = z.tuple([z.number(), z.number(), z.string()]);

/** Formato compacto del enlace: `[[latitud, longitud, nombre], …]`. */
function serializeRouteWaypoints(waypoints: readonly RouteWaypoint[]): string {
  return JSON.stringify(
    waypoints.map(({ latitude, longitude, name }) => [
      latitude,
      longitude,
      name,
    ]),
  );
}

/**
 * Lee las paradas del enlace (entrada no confiable). Si el valor no es la
 * lista esperada, supera el límite o alguna parada es inválida, se ignoran
 * todas: un recorrido incompleto llevaría por un orden que nadie eligió.
 */
export function parseRouteWaypoints(
  value: SearchParamValue,
): readonly RouteWaypoint[] {
  const raw = firstSearchParam(value);
  if (!raw) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }
  const parsed = z
    .array(waypointTupleSchema)
    .max(maxRouteWaypoints)
    .safeParse(decoded);
  if (!parsed.success) return [];
  const waypoints: RouteWaypoint[] = [];
  for (const [latitude, longitude, name] of parsed.data) {
    const coordinate = parseCoordinateParams(
      String(latitude),
      String(longitude),
    );
    if (!coordinate) return [];
    waypoints.push({
      ...coordinate,
      name:
        sanitizeTextParam(name, destinationNameMaxLength) ??
        messages().routing.screen.defaultStop,
    });
  }
  return waypoints;
}

/** Returns the destination only when both values are valid WGS84 degrees. */
export const parseRouteDestination = parseCoordinateParams;

export function parseRouteMode(value: SearchParamValue): RouteMode | null {
  const mode = firstSearchParam(value);
  return isRouteMode(mode) ? mode : null;
}

/** Lee el lugar del catálogo; un valor incompleto o inválido no habilita acciones. */
export function parseRoutePlace(
  kindParam: SearchParamValue,
  idParam: SearchParamValue,
): RoutePlace | null {
  const kind = firstSearchParam(kindParam);
  const id = firstSearchParam(idParam)?.trim();
  if (!id) return null;
  if (kind === "center") return { kind, code: id };
  if (kind === "establishment" && /^\d+$/.test(id)) {
    const numericId = Number(id);
    return Number.isSafeInteger(numericId) && numericId > 0
      ? { kind, id: numericId }
      : null;
  }
  return null;
}

/** Ficha del lugar; en un centro, `tab` abre directamente esa pestaña. */
export function buildRoutePlaceHref(place: RoutePlace, tab?: "opinions"): Href {
  return place.kind === "center"
    ? {
        pathname: "/centers/[code]",
        params: { code: place.code, ...(tab ? { tab } : {}) },
      }
    : // Como en el resto de la app, la ruta de establecimientos se arma como
      // texto: los tipos generados de Expo Router pueden no incluirla aún.
      (`/establishments/${place.id}` as Href);
}
