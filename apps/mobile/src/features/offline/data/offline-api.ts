import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { acceptJsonHeaders, requestJson, type Fetcher } from "@/core/api/http";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import { isValidBasemapStyle } from "@/features/map/data/basemap-style";
import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const boundsSchema = z.tuple([
  longitudeSchema,
  latitudeSchema,
  longitudeSchema,
  latitudeSchema,
]).refine(([west, south, east, north]) => west < east && south < north);
const publishedPackageSchema = z.object({
  version: z.number().int().positive(),
  checksumSha256: z.string().nullable(),
  zoomMin: z.number().int().min(0).max(22),
  zoomMax: z.number().int().min(0).max(22),
  publishedAt: z.string().nullable(),
}).refine((item) => item.zoomMin <= item.zoomMax);
const citySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  canton: z.string().min(1),
  province: z.string().min(1),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  package: publishedPackageSchema.nullable(),
});
const citiesSchema = z.object({ data: z.array(citySchema) });

/** Manifest contract shared by the API client and the local stores. */
const offlineCityManifestSchema = z.object({
  city: citySchema,
  package: publishedPackageSchema,
  boundary: z.record(z.string(), z.unknown()).nullable(),
  bounds: boundsSchema.optional(),
  centers: z.array(publicCenterSchema),
  establishments: z.array(z.object({
    name: z.string().min(1),
    category: z.string().nullable(),
    categoryLabel: z.string().nullable().default(null),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    approximate: z.boolean(),
    icon: z.string(),
    group: z.string().nullable().default(null),
    activity: z.string().default(""),
    classification: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    localityName: z.string().default(""),
  })).default([]),
  pois: z.array(z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    category: z.string().nullable(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    icon: z.string(),
  })).default([]),
  download: z.object({
    savedAt: z.iso.datetime(),
    packId: z.string().min(1),
    styleFileName: z.string().regex(/^[a-zA-Z0-9_-]+\.json$/),
    resourceSizeBytes: z.number().nonnegative().nullable(),
    bounds: boundsSchema,
    mapStyles: z.object({
      light: z.custom(isValidBasemapStyle),
      dark: z.custom(isValidBasemapStyle),
    }),
  }).optional(),
  routes: z.array(
    z.object({
      key: z.string(),
      publicKey: z.string().optional(),
      transportCode: z.string().nullable().optional(),
      distanceMeters: z.number().nonnegative().nullable().optional(),
      name: z.string(),
      origin: z.string(),
      destination: z.string(),
      durationMinutes: z.number().nullable(),
      durationEstimated: z.boolean().default(false),
      geometry: z.object({
        type: z.literal("LineString"),
        coordinates: z.array(z.tuple([longitudeSchema, latitudeSchema])).min(2),
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
