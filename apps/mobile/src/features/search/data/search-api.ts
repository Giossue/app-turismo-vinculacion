import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  requestJson,
  type ApiRequestOptions,
} from "@/core/api/http";
import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicSearchResultPage } from "../domain/search-result";

const resultSchema = z.object({
  kind: z.enum(["center", "establishment", "geographic"]),
  source: z.enum(["internal", "photon"]),
  title: z.string().min(1),
  subtitle: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  centerCode: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  subtype: z.string().nullable().optional(),
  hierarchy: z.string().nullable().optional(),
  categoryCode: z.string().nullable().optional(),
  typeCode: z.string().nullable().optional(),
  subtypeCode: z.string().nullable().optional(),
  provinceCode: z.string().nullable().optional(),
  cantonCode: z.string().nullable().optional(),
  parishCode: z.string().nullable().optional(),
  hierarchyCode: z.string().nullable().optional(),
  approximate: z.boolean().optional(),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

const responseSchema = z.object({
  data: z.object({
    items: z.array(resultSchema),
    meta: z.object({ photonAvailable: z.boolean() }),
  }),
});

export async function searchPublicPlaces(
  query: string,
  coordinate?: GeoCoordinate | null,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<PublicSearchResultPage> {
  const params = new URLSearchParams({ q: query.trim() });
  if (coordinate) {
    params.set("latitude", String(coordinate.latitude));
    params.set("longitude", String(coordinate.longitude));
  }
  const payload = await requestJson(
    `${apiUrl}/search?${params}`,
    responseSchema,
    {
      errorMessage: "No pudimos actualizar la búsqueda.",
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
      invalidMessage: "La búsqueda tiene un formato inválido.",
    },
  );
  return {
    items: payload.data.items,
    photonAvailable: payload.data.meta.photonAvailable,
  };
}
