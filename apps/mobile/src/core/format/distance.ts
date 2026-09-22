export type FormatDistanceOptions = Readonly<{
  /** Rounds distances under 1 km to this step (for example 10 m). */
  stepMeters?: number;
  /** Smallest distance shown under 1 km. */
  minimumMeters?: number;
}>;

/** Formats a distance as `850 m` or `1.2 km`. */
export function formatDistance(
  meters: number,
  { stepMeters = 1, minimumMeters = 0 }: FormatDistanceOptions = {},
): string {
  if (meters < 1_000) {
    const rounded = Math.round(meters / stepMeters) * stepMeters;
    return `${Math.max(minimumMeters, rounded)} m`;
  }
  return `${(meters / 1_000).toFixed(1)} km`;
}

/** Same as `formatDistance`, but returns `null` for missing or invalid values. */
export function formatOptionalDistance(
  meters: number | null | undefined,
): string | null {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return null;
  }
  return formatDistance(meters);
}
