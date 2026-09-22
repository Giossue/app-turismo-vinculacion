import type { GeoCoordinate } from "@/core/geo/types";

export const routeModes = ["car", "bicycle", "foot"] as const;
export type RouteMode = (typeof routeModes)[number];

export function isRouteMode(value: unknown): value is RouteMode {
  return (
    typeof value === "string" &&
    (routeModes as readonly string[]).includes(value)
  );
}

export type RouteRequest = Readonly<{
  mode: RouteMode;
  origin: GeoCoordinate;
  destination: GeoCoordinate;
}>;

export type CalculatedRoute = Readonly<{
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Readonly<{
    type: "LineString";
    coordinates: [number, number][];
  }>;
  steps: readonly Readonly<{
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    name: string | null;
    maneuver: Readonly<{
      type: string;
      modifier: string | null;
      exit: number | null;
    }>;
  }>[];
}>;
