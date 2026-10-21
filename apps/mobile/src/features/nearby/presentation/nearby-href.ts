import type { Href } from "expo-router";

import type { GeoCoordinate } from "@/core/geo/types";
import {
  parseCoordinateParams,
  sanitizeTextParam,
  type SearchParamValue,
} from "@/core/navigation/search-params";
import { messages } from "@/core/i18n/language";

/** El nombre del punto llega en el enlace; se limita como el del destino. */
const centerNameMaxLength = 120;

export type NearbySearchParams = Readonly<{
  latitude?: SearchParamValue;
  longitude?: SearchParamValue;
  name?: SearchParamValue;
}>;

/** Punto alrededor del cual buscar en lugar de la ubicación actual. */
export type NearbyCenter = Readonly<{
  coordinate: GeoCoordinate;
  name: string;
}>;

/**
 * «Cerca de mí» sin parámetros usa el GPS; con un punto (por ejemplo, el
 * destino al que se acaba de llegar) busca alrededor de ese punto.
 */
export function buildNearbyHref(center?: NearbyCenter): Href {
  if (!center) return "/nearby";
  return {
    pathname: "/nearby",
    params: {
      latitude: String(center.coordinate.latitude),
      longitude: String(center.coordinate.longitude),
      name: center.name,
    },
  };
}

/** Un punto incompleto o inválido vuelve a la búsqueda por GPS. */
export function parseNearbySearchParams(
  params: NearbySearchParams,
): NearbyCenter | null {
  const coordinate = parseCoordinateParams(params.latitude, params.longitude);
  if (!coordinate) return null;
  return {
    coordinate,
    name:
      sanitizeTextParam(params.name, centerNameMaxLength) ??
      messages().community.nearby.defaultCenterName,
  };
}
