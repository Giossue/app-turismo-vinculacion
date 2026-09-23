import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { GeoCoordinate } from "@/core/geo/types";
import { readJson, removeJson, writeJson } from "@/core/storage/json-storage";
import {
  routeModes,
  type CalculatedRoute,
  type RouteMode,
} from "../domain/routing";
import { calculatedRouteSchema } from "./routing-api";

const navigationSessionStorageKey = "turismo-vinculacion-active-navigation-v1";
const navigationProgressStorageKey =
  "turismo-vinculacion-active-navigation-progress-v1";

export type PersistedNavigationLocation = Readonly<{
  accuracy: number | null;
  coordinate: GeoCoordinate;
  timestamp: number;
}>;

/**
 * Only what the background task needs to keep an active route going: the
 * route, destination and mode (see `docs/architecture/mobile.md`). It is
 * written when navigation starts and when a recalculated route replaces the
 * previous one, never on each location update.
 */
export type NavigationSessionSnapshot = Readonly<{
  active: boolean;
  destination: GeoCoordinate;
  mode: RouteMode;
  route: CalculatedRoute;
  updatedAt: number;
  version: 1;
}>;

/**
 * Small record the background task rewrites on each accepted fix: the last
 * reliable position and the last notification it published. No trace of
 * previous positions is kept.
 */
export type NavigationProgress = Readonly<{
  lastLocation: PersistedNavigationLocation | null;
  lastNotificationKey: string | null;
}>;

/** `unreadable` is a storage failure, which may be transient. */
export type NavigationSessionRead =
  | Readonly<{ status: "found"; snapshot: NavigationSessionSnapshot }>
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "unreadable" }>;

const coordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// Snapshots written by earlier versions may still carry `origin`,
// `lastLocation`, `lastNotificationKey`, `lastAnnouncedStepIndex` or
// `lastRerouteAt`; `z.object` strips them.
const navigationSessionSnapshotSchema = z.object({
  active: z.boolean(),
  destination: coordinateSchema,
  mode: z.enum(routeModes),
  route: calculatedRouteSchema,
  updatedAt: z.number(),
  version: z.literal(1),
});

const navigationProgressSchema = z.object({
  lastLocation: z
    .object({
      accuracy: z.number().nullable(),
      coordinate: coordinateSchema,
      timestamp: z.number(),
    })
    .nullable(),
  lastNotificationKey: z.string().nullable(),
});

let writeQueue: Promise<boolean> = Promise.resolve(true);

export function buildNavigationSnapshot(
  {
    destination,
    mode,
    route,
  }: Readonly<{
    destination: GeoCoordinate;
    mode: RouteMode;
    route: CalculatedRoute;
  }>,
  now: number = Date.now(),
): NavigationSessionSnapshot {
  return { active: true, destination, mode, route, updatedAt: now, version: 1 };
}

/**
 * Reads the stored session. Missing, malformed or schema-invalid entries are
 * `missing`: there is no route to follow. A storage error is `unreadable`, so
 * the background task can keep running and try again on the next fix.
 */
export async function loadNavigationSession(): Promise<NavigationSessionRead> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(navigationSessionStorageKey);
  } catch {
    return { status: "unreadable" };
  }
  if (raw === null) return { status: "missing" };

  try {
    const parsed = navigationSessionSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { snapshot: parsed.data, status: "found" }
      : { status: "missing" };
  } catch {
    return { status: "missing" };
  }
}

export function readNavigationProgress(): Promise<NavigationProgress | null> {
  return readJson(navigationProgressStorageKey, navigationProgressSchema);
}

/** Resolves `false` instead of rejecting when the device cannot store it. */
export function saveNavigationSession(
  snapshot: NavigationSessionSnapshot,
): Promise<boolean> {
  return enqueueWrite(() => writeJson(navigationSessionStorageKey, snapshot));
}

export function saveNavigationProgress(
  progress: NavigationProgress,
): Promise<boolean> {
  return enqueueWrite(() => writeJson(navigationProgressStorageKey, progress));
}

/**
 * Marks a background arrival. The session stays stored (inactive) so the
 * screen can show the arrival when the app returns to the foreground.
 */
export function markNavigationArrived(): Promise<boolean> {
  return enqueueWrite(async () => {
    const current = await loadNavigationSession();
    if (current.status !== "found" || !current.snapshot.active) return;
    await writeJson(navigationSessionStorageKey, {
      ...current.snapshot,
      active: false,
      updatedAt: Date.now(),
    } satisfies NavigationSessionSnapshot);
  });
}

export function clearNavigationSession(): Promise<boolean> {
  return enqueueWrite(async () => {
    await removeJson(navigationSessionStorageKey);
    await removeJson(navigationProgressStorageKey);
  });
}

/**
 * Serializes writes from the screen and the background task, which share the
 * JS runtime while the app is alive. Writes never reject: callers get whether
 * the value was stored and a failure never blocks the next write.
 */
function enqueueWrite(operation: () => Promise<void>): Promise<boolean> {
  const next = writeQueue.then(operation).then(
    () => true,
    () => false,
  );
  writeQueue = next;
  return next;
}
