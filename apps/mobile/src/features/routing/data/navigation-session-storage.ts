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

export type PersistedNavigationLocation = Readonly<{
  accuracy: number | null;
  coordinate: GeoCoordinate;
  timestamp: number;
}>;

/**
 * Only what the background task needs to keep an active route going: the
 * route, destination, mode and last reliable position (see
 * `docs/architecture/mobile.md`). No trace of previous positions is kept.
 */
export type NavigationSessionSnapshot = Readonly<{
  active: boolean;
  destination: GeoCoordinate;
  lastNotificationKey?: string | null;
  lastLocation: PersistedNavigationLocation | null;
  mode: RouteMode;
  route: CalculatedRoute;
  updatedAt: number;
  version: 1;
}>;

type NavigationSessionPatch = Partial<
  Pick<
    NavigationSessionSnapshot,
    "active" | "lastLocation" | "lastNotificationKey"
  >
>;

const coordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// Snapshots written by earlier versions may still carry `origin`,
// `lastAnnouncedStepIndex` or `lastRerouteAt`; `z.object` strips them.
const navigationSessionSnapshotSchema = z.object({
  active: z.boolean(),
  destination: coordinateSchema,
  lastNotificationKey: z.string().nullable().optional(),
  lastLocation: z
    .object({
      accuracy: z.number().nullable(),
      coordinate: coordinateSchema,
      timestamp: z.number(),
    })
    .nullable(),
  mode: z.enum(routeModes),
  route: calculatedRouteSchema,
  updatedAt: z.number(),
  version: z.literal(1),
});

let writeQueue: Promise<void> = Promise.resolve();

export function readNavigationSession(): Promise<NavigationSessionSnapshot | null> {
  return readJson(navigationSessionStorageKey, navigationSessionSnapshotSchema);
}

export function saveNavigationSession(
  snapshot: NavigationSessionSnapshot,
): Promise<void> {
  return enqueueWrite(() => writeJson(navigationSessionStorageKey, snapshot));
}

/**
 * Updates part of the stored session inside the write queue, so foreground
 * and background writers never overwrite each other's fields. With
 * `requireActive`, a session that already ended is left untouched.
 */
export function patchNavigationSession(
  patch: NavigationSessionPatch,
  { requireActive }: Readonly<{ requireActive: boolean }>,
): Promise<void> {
  return enqueueWrite(async () => {
    const current = await readNavigationSession();
    if (!current || (requireActive && !current.active)) return;

    await writeJson(navigationSessionStorageKey, {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    } satisfies NavigationSessionSnapshot);
  });
}

export function clearNavigationSession(): Promise<void> {
  return enqueueWrite(() => removeJson(navigationSessionStorageKey));
}

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}
