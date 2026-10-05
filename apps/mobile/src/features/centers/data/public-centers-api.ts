import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  ApiError,
  requestJson,
  type ApiRequestOptions,
  type Fetcher,
} from "@/core/api/http";
import type { GeoBounds } from "@/core/geo/types";
import { uniqueByCode } from "../domain/unique-by-code";
import type {
  CenterFilters,
  DiscoveryCatalog,
  PublicCenter,
  PublicCenterDetail,
} from "../domain/public-center";

export const publicCenterSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  category: z.string().min(1),
  type: z.string().min(1),
  subtype: z.string().min(1),
  hierarchy: z.string().nullable(),
  categoryCode: z.string().min(1),
  typeCode: z.string().min(1),
  subtypeCode: z.string().min(1),
  provinceCode: z.string().min(1),
  cantonCode: z.string().min(1),
  parishCode: z.string().min(1),
  hierarchyCode: z.string().nullable(),
});
const detailSchema = publicCenterSchema.extend({
  touristZone: z.string().min(1).nullable(),
  address: z.string().nullable(),
  altitudeMeters: z.number().int().nullable(),
  admission: z
    .object({
      type: z.string(),
      attention: z.string(),
      opensAt: z.string().nullable(),
      closesAt: z.string().nullable(),
      priceFrom: z.number().nullable(),
      priceTo: z.number().nullable(),
    })
    .nullable(),
  activities: z.array(z.string()),
  accessibility: z.array(z.string()),
  facilities: z.array(z.string()),
  photos: z
    .array(
      z.object({
        id: z.number().int().positive(),
        url: z.string().min(1),
        mimeType: z.string().min(1),
        description: z.string().nullable(),
      }),
    )
    .default([]),
});
const optionSchema = z.object({ code: z.string(), name: z.string() });
const catalogSchema = z.object({
  data: z.object({
    categories: z.array(optionSchema),
    types: z.array(optionSchema.extend({ categoryCode: z.string() })),
    subtypes: z.array(optionSchema.extend({ typeCode: z.string() })),
    provinces: z.array(optionSchema),
    cantons: z.array(optionSchema.extend({ provinceCode: z.string() })),
    parishes: z.array(optionSchema.extend({ cantonCode: z.string() })),
    hierarchies: z.array(optionSchema),
  }),
});
const listSchema = z.object({ data: z.array(publicCenterSchema) });
const mapPageSchema = listSchema.extend({
  meta: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().nonnegative(),
  }),
});
const detailResponseSchema = z.object({ data: detailSchema });

export async function getPublishedCenters(
  filters: CenterFilters = {},
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<readonly PublicCenter[]> {
  const query = buildCenterQuery(filters);
  const payload = await requestJson(
    `${apiUrl}/centers${query.size ? `?${query}` : ""}`,
    listSchema,
    {
      errorMessage: "No fue posible cargar los atractivos turísticos.",
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: "La respuesta turística no tiene el formato esperado.",
    },
  );
  return payload.data;
}

/** Completes the visible area's catalog without a silent 50/100-place cap. */
export async function getPublishedMapCenters(
  filters: CenterFilters & Readonly<{ bounds: GeoBounds }>,
  { apiUrl = getApiUrl(), fetcher = fetch, signal }: ApiRequestOptions = {},
): Promise<readonly PublicCenter[]> {
  const query = buildCenterQuery(filters);
  query.set("limit", "100");
  const centers: PublicCenter[] = [];
  const seenCodes = new Set<string>();
  let offset = 0;
  while (true) {
    assertNotAborted(signal);
    query.set("offset", String(offset));
    const page = await requestJson(
      `${apiUrl}/centers?${query}`,
      mapPageSchema,
      {
        errorMessage: "No fue posible cargar los atractivos de esta zona.",
        invalidMessage: "La respuesta turística no tiene el formato esperado.",
        fetcher,
        init: { headers: acceptJsonHeaders, signal },
      },
    );
    assertNotAborted(signal);
    const newCodes = page.data.filter((center) => !seenCodes.has(center.code));
    if (
      page.meta.offset !== offset ||
      page.data.length > page.meta.limit ||
      (page.data.length === 0 && offset < page.meta.total) ||
      (page.data.length > 0 && newCodes.length === 0)
    ) {
      throw new ApiError(
        "No fue posible completar los atractivos de esta zona.",
      );
    }
    for (const center of page.data) seenCodes.add(center.code);
    centers.push(...page.data);
    offset += page.data.length;
    if (offset >= page.meta.total) return uniqueByCode(centers);
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("La consulta fue cancelada.");
  error.name = "AbortError";
  throw error;
}

function buildCenterQuery(filters: CenterFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.text) query.set("q", filters.text);
  if (filters.categoryCode) query.set("categoryCode", filters.categoryCode);
  if (filters.typeCode) query.set("typeCode", filters.typeCode);
  if (filters.subtypeCode) query.set("subtypeCode", filters.subtypeCode);
  if (filters.provinceCode) query.set("provinceCode", filters.provinceCode);
  if (filters.cantonCode) query.set("cantonCode", filters.cantonCode);
  if (filters.parishCode) query.set("parishCode", filters.parishCode);
  if (filters.hierarchyCode) query.set("hierarchyCode", filters.hierarchyCode);
  if (filters.bounds) {
    query.set("west", String(filters.bounds.west));
    query.set("south", String(filters.bounds.south));
    query.set("east", String(filters.bounds.east));
    query.set("north", String(filters.bounds.north));
  }
  return query;
}

export async function getPublishedCenter(
  code: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<PublicCenterDetail> {
  const payload = await requestJson(
    `${apiUrl}/centers/${encodeURIComponent(code)}`,
    detailResponseSchema,
    {
      errorMessage: "No fue posible cargar la ficha turística.",
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: "La ficha turística no tiene el formato esperado.",
      statusMessages: { 404: "El atractivo ya no está disponible." },
    },
  );
  return payload.data;
}

export async function getDiscoveryCatalog(
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<DiscoveryCatalog> {
  const payload = await requestJson(
    `${apiUrl}/centers/catalogs/discovery`,
    catalogSchema,
    {
      errorMessage: "No fue posible cargar los filtros.",
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: "Los filtros no tienen el formato esperado.",
    },
  );
  return payload.data;
}
