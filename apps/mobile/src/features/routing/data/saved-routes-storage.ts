import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { GeoCoordinate } from "@/core/geo/types";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import { calculatedRouteSchema } from "./routing-api";

const savedRoutesStoragePrefix = "turismo-vinculacion-saved-routes-v1";
export const savedCalculatedRouteLimit = 20;

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const savedRouteKeySchema = z.string().regex(/^route-[a-z0-9-]{1,70}$/);

const usableRouteSchema = calculatedRouteSchema.refine(
  (route) =>
    route.distanceMeters >= 0 &&
    route.durationSeconds >= 0 &&
    route.geometry.coordinates.length >= 2 &&
    route.geometry.coordinates.every(
      ([longitude, latitude]) =>
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90,
    ) &&
    route.steps.every(
      (step) => step.distanceMeters >= 0 && step.durationSeconds >= 0,
    ),
);

const savedRouteInputSchema = z
  .object({
    destination: coordinateSchema,
    destinationName: z.string().trim().min(1).max(180),
    mode: calculatedRouteSchema.shape.mode,
    origin: coordinateSchema,
    route: usableRouteSchema,
  })
  .refine((value) => value.mode === value.route.mode);

const savedCalculatedRouteSchema = savedRouteInputSchema.safeExtend({
  key: savedRouteKeySchema,
  savedAt: z.number().int().nonnegative(),
});

const storedRoutesSchema = z.object({
  version: z.literal(1),
  routes: z.array(z.unknown()),
});

export type SavedCalculatedRouteInput = Readonly<{
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  destinationName: string;
  mode: RouteMode;
  route: CalculatedRoute;
}>;

/** A user explicitly saved this route; this is not an active GPS session. */
export type SavedCalculatedRoute = SavedCalculatedRouteInput &
  Readonly<{ key: string; savedAt: number }>;

export class SavedRouteStorageError extends Error {}

let writeQueue: Promise<unknown> = Promise.resolve();

/** Invalid entries are skipped without hiding the remaining usable routes. */
export async function listSavedCalculatedRoutes(
  userId: number,
): Promise<readonly SavedCalculatedRoute[]> {
  const key = getStorageKey(userId);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    throw new SavedRouteStorageError(
      "No pudimos leer tus rutas guardadas. Inténtalo otra vez.",
    );
  }
  if (raw === null) return [];

  try {
    const stored = storedRoutesSchema.safeParse(JSON.parse(raw));
    if (!stored.success) return [];
    const routes = stored.data.routes.flatMap((value) => {
      const parsed = savedCalculatedRouteSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
    return routes
      .sort((first, second) => second.savedAt - first.savedAt)
      .filter(
        (route, index, all) =>
          all.findIndex((other) => other.key === route.key) === index,
      )
      .slice(0, savedCalculatedRouteLimit);
  } catch {
    return [];
  }
}

export async function loadSavedCalculatedRoute(
  userId: number,
  key: string,
): Promise<SavedCalculatedRoute | null> {
  if (!savedRouteKeySchema.safeParse(key).success) return null;
  const routes = await listSavedCalculatedRoutes(userId);
  return routes.find((route) => route.key === key) ?? null;
}

/** Saves the chosen origin and route once, without recording GPS updates. */
export function saveCalculatedRoute(
  userId: number,
  input: SavedCalculatedRouteInput,
  savedAt: number = Date.now(),
): Promise<SavedCalculatedRoute> {
  return enqueueWrite(async () => {
    const parsed = savedRouteInputSchema.safeParse(input);
    if (!parsed.success || !Number.isSafeInteger(savedAt) || savedAt < 0) {
      throw new SavedRouteStorageError(
        "Esta ruta no tiene datos válidos para guardarla.",
      );
    }
    // A failed read propagates: never replace unreadable storage with [].
    const existing = await listSavedCalculatedRoutes(userId);
    const previous = existing.find((route) => sameRequest(route, parsed.data));
    const route: SavedCalculatedRoute = {
      ...parsed.data,
      key: previous?.key ?? createSavedRouteKey(savedAt),
      savedAt,
    };
    const next = [route, ...existing.filter((item) => item.key !== route.key)];
    await writeRoutes(userId, next.slice(0, savedCalculatedRouteLimit));
    return route;
  });
}

export function deleteSavedCalculatedRoute(
  userId: number,
  key: string,
): Promise<void> {
  return enqueueWrite(async () => {
    const existing = await listSavedCalculatedRoutes(userId);
    await writeRoutes(
      userId,
      existing.filter((route) => route.key !== key),
    );
  });
}

export function describeSavedRouteError(error: unknown): string {
  return error instanceof SavedRouteStorageError
    ? error.message
    : "No pudimos guardar la ruta en este dispositivo.";
}

function getStorageKey(userId: number): string {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new SavedRouteStorageError("Inicia sesión para usar tus rutas.");
  }
  return `${savedRoutesStoragePrefix}-${userId}`;
}

function createSavedRouteKey(savedAt: number): string {
  // Opaque local identifier. Coordinates never appear in links or keys.
  return `route-${savedAt.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function sameRequest(
  first: SavedCalculatedRouteInput,
  second: SavedCalculatedRouteInput,
): boolean {
  return (
    first.mode === second.mode &&
    first.origin.latitude === second.origin.latitude &&
    first.origin.longitude === second.origin.longitude &&
    first.destination.latitude === second.destination.latitude &&
    first.destination.longitude === second.destination.longitude
  );
}

async function writeRoutes(
  userId: number,
  routes: readonly SavedCalculatedRoute[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      getStorageKey(userId),
      JSON.stringify({ routes, version: 1 }),
    );
  } catch {
    throw new SavedRouteStorageError(
      "No pudimos actualizar tus rutas en este dispositivo. Revisa el espacio disponible.",
    );
  }
}

/** Serialize read-modify-write operations; a failed write does not block later ones. */
function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation);
  writeQueue = next.catch(() => undefined);
  return next;
}
