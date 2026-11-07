import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";
import type { PublicCenter } from "../domain/public-center";
import { publicCenterSchema } from "./public-centers-api";

// Clave propia: una copia nacional no debe agrandar el caché de consultas.
const storageKey = "rumbo-ec-center-pins:v1";

const snapshotSchema = z.object({
  savedAt: z.number().finite(),
  centers: z.array(publicCenterSchema),
});

export function readCenterPinSnapshot() {
  return readJson(storageKey, snapshotSchema);
}

export function saveCenterPinSnapshot(
  centers: readonly PublicCenter[],
): Promise<void> {
  // Los pines no usan la descripción, que es lo que más pesa en disco.
  return writeJson(storageKey, {
    savedAt: Date.now(),
    centers: centers.map((center) => ({ ...center, description: null })),
  });
}
