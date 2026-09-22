import type { Href } from "expo-router";

import type { GeoCoordinate } from "@/core/geo/types";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/core/navigation/search-params";
import { isRouteMode, type RouteMode } from "../domain/routing";

export type RouteDestination = GeoCoordinate & Readonly<{ name: string }>;

export type RouteSearchParams = Readonly<{
  destinationLatitude?: SearchParamValue;
  destinationLongitude?: SearchParamValue;
  destinationName?: SearchParamValue;
  mode?: SearchParamValue;
}>;

export type ParsedRouteSearchParams = Readonly<{
  destination: GeoCoordinate | null;
  destinationName: string;
  mode: RouteMode;
}>;

/** Opens the route preview towards `destination`, optionally in a mode. */
export function buildRouteHref(
  destination: RouteDestination,
  mode?: RouteMode,
): Href {
  return {
    pathname: "/route",
    params: {
      destinationLatitude: String(destination.latitude),
      destinationLongitude: String(destination.longitude),
      destinationName: destination.name,
      ...(mode ? { mode } : {}),
    },
  };
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
    destinationName: firstSearchParam(params.destinationName) ?? "Destino",
    mode: parseRouteMode(params.mode) ?? "car",
  };
}

/** Returns the destination only when both values are valid WGS84 degrees. */
export function parseRouteDestination(
  latitudeParam: SearchParamValue,
  longitudeParam: SearchParamValue,
): GeoCoordinate | null {
  const latitude = Number(firstSearchParam(latitudeParam));
  const longitude = Number(firstSearchParam(longitudeParam));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return null;
  return { latitude, longitude };
}

export function parseRouteMode(value: SearchParamValue): RouteMode | null {
  const mode = firstSearchParam(value);
  return isRouteMode(mode) ? mode : null;
}
