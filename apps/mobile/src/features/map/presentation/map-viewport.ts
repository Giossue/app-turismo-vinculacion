import type { CenterMapViewport } from "./center-map.types";

/**
 * MapLibre v11 uses [longitude, latitude] and a flat GeoJSON bounding box.
 * Reject malformed/native transient values instead of inventing a search area.
 * A single bbox cannot represent a viewport crossing the antimeridian.
 */
export function parseMapViewport(
  center: unknown,
  bounds: unknown,
): CenterMapViewport | null {
  if (
    !Array.isArray(center) ||
    center.length !== 2 ||
    !Array.isArray(bounds) ||
    bounds.length !== 4 ||
    !center.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    ) ||
    !bounds.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  ) {
    return null;
  }

  const [longitude, latitude] = center;
  const [west, south, east, north] = bounds;
  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  ) {
    return null;
  }

  return {
    center: { longitude, latitude },
    bounds: [west, south, east, north],
  };
}

/** Ignore native rounding noise below roughly one centimetre at the equator. */
export function isSameMapViewport(
  previous: CenterMapViewport | null,
  next: CenterMapViewport,
): boolean {
  const tolerance = 0.0000001;
  return (
    previous !== null &&
    Math.abs(previous.center.longitude - next.center.longitude) <= tolerance &&
    Math.abs(previous.center.latitude - next.center.latitude) <= tolerance &&
    previous.bounds.every(
      (value, index) => Math.abs(value - next.bounds[index]!) <= tolerance,
    )
  );
}
