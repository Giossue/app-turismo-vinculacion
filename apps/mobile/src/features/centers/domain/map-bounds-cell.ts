import type { GeoBounds } from "@/core/geo/types";

/**
 * Grid size, in degrees, that visible-area queries are snapped to (~550 m in
 * latitude). Small pans inside the same cells reuse the cached response.
 */
export const mapBoundsCellDegrees = 0.005;

/**
 * Expands `bounds` outward to the enclosing grid of `cellDegrees`, so nearby
 * viewports share one query key and the fetched area always covers the
 * camera box. Values are rounded to avoid float noise in the key.
 */
export function quantizeMapBounds(
  bounds: GeoBounds,
  cellDegrees = mapBoundsCellDegrees,
): GeoBounds {
  return {
    west: snapDown(bounds.west, cellDegrees),
    south: snapDown(bounds.south, cellDegrees),
    east: snapUp(bounds.east, cellDegrees),
    north: snapUp(bounds.north, cellDegrees),
  };
}

// Six decimals (~0.1 m) is enough to make the key stable while keeping the
// expanded box within the valid WGS84 range for edge cells.
const keyDecimals = 6;

// The quotient is rounded first so a value sitting on a cell edge (e.g.
// -79.02 / 0.005 = -15804.000000000002) is not pushed into the next cell.
function snapDown(value: number, cellDegrees: number): number {
  return roundKey(Math.floor(roundKey(value / cellDegrees)) * cellDegrees);
}

function snapUp(value: number, cellDegrees: number): number {
  return roundKey(Math.ceil(roundKey(value / cellDegrees)) * cellDegrees);
}

function roundKey(value: number): number {
  return Number(value.toFixed(keyDecimals));
}
