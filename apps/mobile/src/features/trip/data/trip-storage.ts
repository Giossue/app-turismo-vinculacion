import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";
import { maxTripStops, type TripStop } from "../domain/trip";

const tripStorageKey = "rumbo-ec-trip-v1";

const tripStopSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  place: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("center"), code: z.string().min(1) }),
    z.object({
      kind: z.literal("establishment"),
      id: z.number().int().positive(),
    }),
  ]),
});

const storedTripSchema = z.object({
  stops: z.array(tripStopSchema).max(maxTripStops),
  version: z.literal(1),
});

/**
 * El recorrido vive solo en este dispositivo: lugares públicos elegidos por
 * la persona, sin su ubicación. Un valor ilegible equivale a un recorrido vacío.
 */
export async function readStoredTrip(): Promise<readonly TripStop[]> {
  return (await readJson(tripStorageKey, storedTripSchema))?.stops ?? [];
}

/** Resuelve `false` en lugar de rechazar si el dispositivo no puede guardarlo. */
export async function saveStoredTrip(
  stops: readonly TripStop[],
): Promise<boolean> {
  try {
    await writeJson(tripStorageKey, { stops, version: 1 });
    return true;
  } catch {
    return false;
  }
}
