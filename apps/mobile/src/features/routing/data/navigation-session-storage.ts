import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  routeModes,
  type CalculatedRoute,
  type RouteCoordinate,
  type RouteMode,
} from "../domain/routing";

const navigationSessionStorageKey = "turismo-vinculacion-active-navigation-v1";

export type PersistedNavigationLocation = Readonly<{
  accuracy: number | null;
  coordinate: RouteCoordinate;
  timestamp: number;
}>;

export type NavigationSessionSnapshot = Readonly<{
  active: boolean;
  destination: RouteCoordinate;
  lastAnnouncedStepIndex: number;
  lastLocation: PersistedNavigationLocation | null;
  lastRerouteAt: number;
  mode: RouteMode;
  origin: RouteCoordinate;
  route: CalculatedRoute;
  updatedAt: number;
  version: 1;
}>;

let writeQueue: Promise<void> = Promise.resolve();

export async function readNavigationSession(): Promise<NavigationSessionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(navigationSessionStorageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isNavigationSessionSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveNavigationSession(
  snapshot: NavigationSessionSnapshot,
): Promise<void> {
  return enqueueWrite(async () => {
    await AsyncStorage.setItem(
      navigationSessionStorageKey,
      JSON.stringify(snapshot),
    );
  });
}

export function updateNavigationLocation(
  location: PersistedNavigationLocation,
): Promise<void> {
  return enqueueWrite(async () => {
    const current = await readNavigationSession();
    if (!current?.active) return;

    await AsyncStorage.setItem(
      navigationSessionStorageKey,
      JSON.stringify({
        ...current,
        lastLocation: location,
        updatedAt: Date.now(),
      } satisfies NavigationSessionSnapshot),
    );
  });
}

export function clearNavigationSession(): Promise<void> {
  return enqueueWrite(() =>
    AsyncStorage.removeItem(navigationSessionStorageKey),
  );
}

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}

function isNavigationSessionSnapshot(
  value: unknown,
): value is NavigationSessionSnapshot {
  if (!isRecord(value)) return false;
  if (value.version !== 1 || typeof value.active !== "boolean") return false;
  if (!isRouteMode(value.mode)) return false;
  if (!isCoordinate(value.origin) || !isCoordinate(value.destination)) {
    return false;
  }
  if (!isRecord(value.route) || !Array.isArray(value.route.steps)) return false;
  return (
    typeof value.lastAnnouncedStepIndex === "number" &&
    typeof value.lastRerouteAt === "number" &&
    (value.lastLocation === null || isPersistedLocation(value.lastLocation)) &&
    typeof value.updatedAt === "number"
  );
}

function isPersistedLocation(
  value: unknown,
): value is PersistedNavigationLocation {
  if (!isRecord(value)) return false;
  return (
    isCoordinate(value.coordinate) &&
    (value.accuracy === null || typeof value.accuracy === "number") &&
    typeof value.timestamp === "number"
  );
}

function isCoordinate(value: unknown): value is RouteCoordinate {
  if (!isRecord(value)) return false;
  return (
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude)
  );
}

function isRouteMode(value: unknown): value is RouteMode {
  return typeof value === "string" && routeModes.includes(value as RouteMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
