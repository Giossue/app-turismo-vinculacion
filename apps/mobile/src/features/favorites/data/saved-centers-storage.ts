import { z } from "zod";

import { readJson, removeJson, writeJson } from "@/core/storage/json-storage";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import type { PublicCenter } from "@/features/centers/domain/public-center";

/**
 * Device-wide list written by versions that saved places before tourist
 * accounts existed. It is only read to import it once into the account that
 * signs in; saved places now live exclusively in `favoritos_centros`.
 */
const legacyStorageKey = "turismo-vinculacion-saved-centers-v1";

export async function listLegacySavedCenters(): Promise<
  readonly PublicCenter[]
> {
  const stored = await readJson(legacyStorageKey, z.array(z.unknown()));
  return (stored ?? []).flatMap((value) => {
    const center = publicCenterSchema.safeParse(value);
    return center.success ? [center.data] : [];
  });
}

/** Keeps only the legacy entries that still need to be imported. */
export async function replaceLegacySavedCenters(
  centers: readonly PublicCenter[],
): Promise<void> {
  if (centers.length) {
    await writeJson(legacyStorageKey, centers);
  } else {
    await removeJson(legacyStorageKey);
  }
}
