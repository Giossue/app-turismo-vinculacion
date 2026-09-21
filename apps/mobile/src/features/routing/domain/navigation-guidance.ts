import type { CalculatedRoute, RouteCoordinate } from "./routing";

const earthRadiusMeters = 6_371_000;
const metersPerDegreeLatitude = 111_320;

export type NavigationGuidance = Readonly<{
  stepIndex: number;
  instruction: string;
  distanceMeters: number;
}>;

export type NavigationNotification = Readonly<{
  body: string;
  key: string;
}>;

export type RouteRemainingMetrics = Readonly<{
  distanceMeters: number;
  durationSeconds: number;
}>;

type RouteProgress = Readonly<{
  distanceAlongRouteMeters: number;
  distanceToRouteMeters: number;
  routeLengthMeters: number;
}>;

/** Returns the great-circle distance between two geographic coordinates. */
export function getDistanceMeters(
  first: RouteCoordinate,
  second: RouteCoordinate,
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
  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)))
  );
}

/** Returns the shortest approximate distance from a point to a route line. */
export function getDistanceToRouteMeters(
  route: CalculatedRoute,
  coordinate: RouteCoordinate,
): number {
  return getRouteProgress(route, coordinate).distanceToRouteMeters;
}

/** Estimates the remaining route distance and duration from the current position. */
export function getRouteRemainingMetrics(
  route: CalculatedRoute,
  coordinate: RouteCoordinate,
): RouteRemainingMetrics {
  const progress = getRouteProgress(route, coordinate);
  if (progress.routeLengthMeters <= 0) {
    return {
      distanceMeters: Math.max(0, route.distanceMeters),
      durationSeconds: Math.max(0, route.durationSeconds),
    };
  }

  const progressRatio = Math.min(
    1,
    Math.max(0, progress.distanceAlongRouteMeters / progress.routeLengthMeters),
  );
  const remainingRatio = 1 - progressRatio;
  return {
    distanceMeters: Math.max(0, route.distanceMeters * remainingRatio),
    durationSeconds: Math.max(0, route.durationSeconds * remainingRatio),
  };
}

/** Finds the next OSRM instruction and its approximate remaining distance. */
export function getNavigationGuidance(
  route: CalculatedRoute,
  coordinate: RouteCoordinate,
): NavigationGuidance | null {
  if (!route.steps.length) return null;

  const progress = getRouteProgress(route, coordinate);
  const totalStepDistance = route.steps.reduce(
    (total, step) => total + Math.max(0, step.distanceMeters),
    0,
  );
  const normalizedProgress =
    progress.routeLengthMeters > 0
      ? Math.min(
          totalStepDistance,
          (progress.distanceAlongRouteMeters / progress.routeLengthMeters) *
            totalStepDistance,
        )
      : 0;

  let stepStart = 0;
  for (const [stepIndex, step] of route.steps.entries()) {
    const stepEnd = stepStart + Math.max(0, step.distanceMeters);
    if (stepIndex === route.steps.length - 1 || normalizedProgress < stepEnd) {
      return {
        distanceMeters: Math.max(0, stepEnd - normalizedProgress),
        instruction: step.instruction,
        stepIndex,
      };
    }
    stepStart = stepEnd;
  }

  return null;
}

/** Builds a compact notification body and a key for meaningful updates only. */
export function getNavigationNotification(
  guidance: NavigationGuidance | null,
): NavigationNotification {
  if (!guidance) {
    return {
      body: "Navegación activa. Abre la app para ver la ruta.",
      key: "active",
    };
  }

  const distance = formatNotificationDistance(guidance.distanceMeters);
  return {
    body:
      guidance.distanceMeters <= 5
        ? `Ahora: ${guidance.instruction}`
        : `En ${distance}: ${guidance.instruction}`,
    key: `${guidance.stepIndex}:${distance}:${guidance.instruction}`,
  };
}

function getRouteProgress(
  route: CalculatedRoute,
  coordinate: RouteCoordinate,
): RouteProgress {
  const coordinates = route.geometry.coordinates;
  if (coordinates.length < 2) {
    const first = coordinates[0];
    return {
      distanceAlongRouteMeters: 0,
      distanceToRouteMeters: first
        ? getDistanceMeters(coordinate, {
            latitude: first[1],
            longitude: first[0],
          })
        : Number.POSITIVE_INFINITY,
      routeLengthMeters: 0,
    };
  }

  let routeLengthMeters = 0;
  let nearestDistanceMeters = Number.POSITIVE_INFINITY;
  let nearestDistanceAlongRouteMeters = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    const startCoordinate = {
      latitude: start[1],
      longitude: start[0],
    } satisfies RouteCoordinate;
    const endCoordinate = {
      latitude: end[1],
      longitude: end[0],
    } satisfies RouteCoordinate;
    const segmentLengthMeters = getDistanceMeters(
      startCoordinate,
      endCoordinate,
    );
    const projection = projectPoint(startCoordinate, endCoordinate, coordinate);
    const projectedCoordinate = {
      latitude:
        startCoordinate.latitude +
        (endCoordinate.latitude - startCoordinate.latitude) * projection,
      longitude:
        startCoordinate.longitude +
        (endCoordinate.longitude - startCoordinate.longitude) * projection,
    } satisfies RouteCoordinate;
    const distanceToProjectionMeters = getDistanceMeters(
      coordinate,
      projectedCoordinate,
    );

    if (distanceToProjectionMeters < nearestDistanceMeters) {
      nearestDistanceMeters = distanceToProjectionMeters;
      nearestDistanceAlongRouteMeters =
        routeLengthMeters + segmentLengthMeters * projection;
    }
    routeLengthMeters += segmentLengthMeters;
  }

  return {
    distanceAlongRouteMeters: nearestDistanceAlongRouteMeters,
    distanceToRouteMeters: nearestDistanceMeters,
    routeLengthMeters,
  };
}

function projectPoint(
  start: RouteCoordinate,
  end: RouteCoordinate,
  point: RouteCoordinate,
): number {
  const meanLatitude = toRadians((start.latitude + end.latitude) / 2);
  const longitudeScale = Math.max(
    Math.cos(meanLatitude) * metersPerDegreeLatitude,
    1,
  );
  const startX = start.longitude * longitudeScale;
  const startY = start.latitude * metersPerDegreeLatitude;
  const endX = end.longitude * longitudeScale;
  const endY = end.latitude * metersPerDegreeLatitude;
  const pointX = point.longitude * longitudeScale;
  const pointY = point.latitude * metersPerDegreeLatitude;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const squaredLength = deltaX ** 2 + deltaY ** 2;
  if (squaredLength === 0) return 0;
  return Math.min(
    1,
    Math.max(
      0,
      ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / squaredLength,
    ),
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function formatNotificationDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
