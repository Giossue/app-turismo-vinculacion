/** Share of the gap to the new compass reading applied on each event. */
const headingSmoothingFactor = 0.18;
/** Smaller rotations are not worth a re-render and a camera animation. */
const headingMinimumChangeDegrees = 2;
/** Caps map updates from the compass at about 5 per second. */
export const headingMinimumIntervalMs = 200;

export type PublishedHeading = Readonly<{ at: number; bearing: number }>;

/** Wraps any angle into `[0, 360)`. */
export function normalizeBearing(heading: number): number {
  const bearing = heading % 360;
  return bearing < 0 ? bearing + 360 : bearing;
}

/** Smallest angle between two bearings, in `[0, 180]`. */
export function getBearingDifference(from: number, to: number): number {
  return Math.abs(((to - from + 540) % 360) - 180);
}

/** Moves `currentBearing` towards `targetBearing` along the shortest arc. */
export function smoothBearing(
  currentBearing: number,
  targetBearing: number,
  factor: number = headingSmoothingFactor,
): number {
  const delta = ((targetBearing - currentBearing + 540) % 360) - 180;
  return normalizeBearing(currentBearing + delta * factor);
}

/**
 * The compass can emit dozens of events per second. Only publish a bearing
 * to the map when it moved enough and the previous update is old enough.
 */
export function shouldPublishHeading(
  previous: PublishedHeading | null,
  bearing: number,
  now: number,
): boolean {
  if (!previous) return true;
  return (
    now - previous.at >= headingMinimumIntervalMs &&
    getBearingDifference(previous.bearing, bearing) >=
      headingMinimumChangeDegrees
  );
}
