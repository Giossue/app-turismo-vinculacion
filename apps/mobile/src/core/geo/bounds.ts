import type { GeoBoundingBox } from "./types";

/**
 * Returns the `[west, south, east, north]` box that contains every
 * `[longitude, latitude]` pair, or `null` when there are none.
 *
 * A plain loop keeps large geometries safe: `Math.min(...values)` spreads
 * every element as an argument and can throw a RangeError.
 */
export function getCoordinateBounds(
  coordinates: Iterable<readonly [number, number]>,
): GeoBoundingBox | null {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let empty = true;

  for (const [longitude, latitude] of coordinates) {
    empty = false;
    if (longitude < west) west = longitude;
    if (longitude > east) east = longitude;
    if (latitude < south) south = latitude;
    if (latitude > north) north = latitude;
  }

  return empty ? null : [west, south, east, north];
}
