import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";

const packageSchema = z
  .object({
    version: z.number().int().positive(),
    checksumSha256: z.string().nullable(),
    zoomMin: z.number().int(),
    zoomMax: z.number().int(),
    publishedAt: z.string().nullable(),
  })
  .nullable();
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
  package: packageSchema,
});
const citiesSchema = z.object({ data: z.array(citySchema) });
const manifestSchema = z.object({
  data: z.object({
    city: citySchema,
    package: publishedPackageSchema,
    boundary: z.record(z.string(), z.unknown()).nullable(),
    centers: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        latitude: z.number(),
        longitude: z.number(),
        category: z.string(),
        type: z.string(),
        subtype: z.string(),
        hierarchy: z.string().nullable(),
        categoryCode: z.string(),
        typeCode: z.string(),
        subtypeCode: z.string(),
        provinceCode: z.string(),
        cantonCode: z.string(),
        parishCode: z.string(),
        hierarchyCode: z.string().nullable(),
      }),
    ),
    routes: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        origin: z.string(),
        destination: z.string(),
        durationMinutes: z.number().nullable(),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z.array(z.tuple([z.number(), z.number()])),
        }),
        directions: z.array(z.unknown()),
      }),
    ),
  }),
});

export async function getOfflineCities(
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<readonly OfflineCity[]> {
  const response = await fetcher(`${apiUrl}/offline/cities`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("No pudimos cargar las ciudades offline.");
  const payload = citiesSchema.safeParse(await response.json());
  if (!payload.success) throw new Error("El catálogo offline no es válido.");
  return payload.data.data;
}

export async function getOfflineCityManifest(
  slug: string,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<OfflineCityManifest> {
  const response = await fetcher(
    `${apiUrl}/offline/cities/${encodeURIComponent(slug)}/manifest`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok)
    throw new Error("Esta ciudad aún no tiene paquete offline.");
  const payload = manifestSchema.safeParse(await response.json());
  if (!payload.success) throw new Error("El manifiesto offline no es válido.");
  return payload.data.data;
}
