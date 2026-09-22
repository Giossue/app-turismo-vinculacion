import type { GeoCoordinate } from "./types";

export const earthRadiusMeters = 6_371_000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Returns the great-circle (haversine) distance between two coordinates. */
export function getDistanceMeters(
  first: GeoCoordinate,
  second: GeoCoordinate,
): number {
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  // Clamp the complement: rounding can push `haversine` slightly above 1 for
  // antipodal points, which would otherwise produce NaN.
  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)))
  );
}

/**
 * Moves a coordinate `distanceMeters` along the great circle that starts with
 * `bearingDegrees` (0 = north, 90 = east).
 */
export function offsetCoordinate(
  coordinate: GeoCoordinate,
  distanceMeters: number,
  bearingDegrees: number,
): GeoCoordinate {
  const angularDistance = distanceMeters / earthRadiusMeters;
  const bearing = toRadians(bearingDegrees);
  const latitude = toRadians(coordinate.latitude);
  const longitude = toRadians(coordinate.longitude);
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );

  return {
    latitude: toDegrees(nextLatitude),
    longitude: normalizeLongitude(toDegrees(nextLongitude)),
  };
}

/** Wraps a longitude into the `[-180, 180)` range. */
export function normalizeLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180;
}
