export const routeModes = ["car", "bicycle", "foot"] as const;
export type RouteMode = (typeof routeModes)[number];

export type RouteCoordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type RouteRequest = Readonly<{
  mode: RouteMode;
  origin: RouteCoordinate;
  destination: RouteCoordinate;
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
