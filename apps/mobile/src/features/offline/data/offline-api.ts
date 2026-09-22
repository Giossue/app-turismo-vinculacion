import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { acceptJsonHeaders, requestJson, type Fetcher } from "@/core/api/http";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";

const publishedPackageSchema = z.object({
  version: z.number().int().positive(),
  checksumSha256: z.string().nullable(),
  zoomMin: z.number().int(),
  zoomMax: z.number().int(),
  publishedAt: z.string().nullable(),
});
const citySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  canton: z.string().min(1),
  province: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  package: publishedPackageSchema.nullable(),
});
const citiesSchema = z.object({ data: z.array(citySchema) });

/** Manifest contract shared by the API client and the local stores. */
const offlineCityManifestSchema = z.object({
  city: citySchema,
  package: publishedPackageSchema,
  boundary: z.record(z.string(), z.unknown()).nullable(),
  centers: z.array(publicCenterSchema),
  routes: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      origin: z.string(),
      destination: z.string(),
      durationMinutes: z.number().nullable(),
      durationEstimated: z.boolean().default(false),
      geometry: z.object({
        type: z.literal("LineString"),
        coordinates: z.array(z.tuple([z.number(), z.number()])),
      }),
      directions: z.array(z.unknown()),
    }),
  ),
});
const manifestResponseSchema = z.object({ data: offlineCityManifestSchema });

export async function getOfflineCities(
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<readonly OfflineCity[]> {
  const payload = await requestJson(`${apiUrl}/offline/cities`, citiesSchema, {
    errorMessage: "No pudimos cargar las ciudades offline.",
    fetcher,
    init: { headers: acceptJsonHeaders },
    invalidMessage: "El catálogo offline no es válido.",
  });
  return payload.data;
}

export async function getOfflineCityManifest(
  slug: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<OfflineCityManifest> {
  const payload = await requestJson(
    `${apiUrl}/offline/cities/${encodeURIComponent(slug)}/manifest`,
    manifestResponseSchema,
    {
      errorMessage: "Esta ciudad aún no tiene paquete offline.",
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: "El manifiesto offline no es válido.",
    },
  );
  return payload.data;
}

/** Parses a manifest saved on the device; corrupt entries return `null`. */
export function parseStoredOfflineManifest(
  json: string,
): OfflineCityManifest | null {
  try {
    const parsed = offlineCityManifestSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
