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

export type RouteGeometry = Readonly<{
  type: "LineString";
  coordinates: [number, number][];
}>;

export type RouteStep = Readonly<{
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string | null;
  maneuver: Readonly<{
    type: string;
    modifier: string | null;
    exit: number | null;
  }>;
}>;

export type CalculatedRoute = Readonly<{
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  steps: readonly RouteStep[];
}>;
