import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { PublicMapEstablishment } from "../domain/establishment";

/**
 * Vector tiles (MVT) of the published registry, served by
 * `GET /establishments/tiles/:z/:x/:y`. MapLibre requests, caches and drops
 * them by itself; the app only reads the features the tourist taps.
 */
export const establishmentTileLayer = "establishments";
/** From this zoom each feature is one establishment; below, a cell count. */
export const establishmentTileDetailZoom = 13;
/** Deeper zooms reuse (overzoom) these tiles instead of requesting more. */
export const establishmentTileMaxZoom = 16;

export function getEstablishmentTilesUrl(apiUrl = getApiUrl()): string {
  return `${apiUrl}/establishments/tiles/{z}/{x}/{y}`;
}

const detailFeatureSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullish(),
  categoryLabel: z.string().nullish(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  approximate: z.boolean(),
  icon: z.string().min(1),
});

/** The establishment behind a tapped detail feature, or null (e.g. a cell). */
export function parseEstablishmentTileFeature(
  properties: unknown,
): PublicMapEstablishment | null {
  const parsed = detailFeatureSchema.safeParse(properties);
  if (!parsed.success) return null;
  const { category, categoryLabel, ...establishment } = parsed.data;
  return {
    ...establishment,
    category: category ?? null,
    categoryLabel: categoryLabel ?? category ?? null,
  };
}
