import type { GeoCoordinate } from "@/core/geo/types";

/** Expo Router search params can repeat; screens only read the first value. */
export type SearchParamValue = string | string[] | undefined;

/** Returns the first trimmed value of a search param, or `undefined` if empty. */
export function firstSearchParam(value: SearchParamValue): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result?.trim() || undefined;
}

/**
 * Texto visible que llega en un enlace (entrada no confiable): quita
 * caracteres de control, colapsa espacios y recorta a `maxLength` caracteres.
 * Devuelve `undefined` si queda vacío.
 */
export function sanitizeTextParam(
  value: SearchParamValue,
  maxLength: number,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const clean = raw
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean ? Array.from(clean).slice(0, maxLength).join("") : undefined;
}

/** Devuelve la coordenada solo cuando ambos valores son grados WGS84 válidos. */
export function parseCoordinateParams(
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
