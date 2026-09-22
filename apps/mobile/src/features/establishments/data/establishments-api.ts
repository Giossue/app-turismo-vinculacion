import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  assertResponseOk,
  parseJsonResponse,
  requestJson,
  sendRequest,
  type ApiRequestOptions,
} from "@/core/api/http";
import type { GeoBounds } from "@/core/geo/types";
import type {
  MapEstablishmentsResult,
  NearbyEstablishmentsQuery,
  NearbyEstablishmentsResult,
} from "../domain/establishment";

const establishmentSchema = z.object({
  nombreComercial: z.string().min(1),
  actividad: z.string().min(1),
  clasificacion: z.string().nullable(),
  categoria: z.string().nullable(),
  categoriaEtiqueta: z.string().nullable().optional(),
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  latitude: z.number().finite().nullable(),
  longitude: z.number().finite().nullable(),
  distanceMeters: z.number().finite().nonnegative().nullable(),
  localityName: z.string().min(1),
});

const responseSchema = z.object({
  data: z.object({
    items: z.array(establishmentSchema),
    fallbackApplied: z.boolean(),
    requestedLocalityName: z.string().nullable(),
    effectiveLocality: z
      .object({
        name: z.string().min(1),
        type: z.string().min(1),
        cantonName: z.string().min(1),
        provinceName: z.string().min(1),
        distanceMeters: z.number().finite().nonnegative().nullable(),
      })
      .nullable(),
  }),
});
const mapResponseSchema = z.object({
  data: z.object({
    items: z.array(
      z.object({
        name: z.string().min(1),
        category: z.string().nullable(),
        categoryLabel: z.string().nullable().optional(),
        latitude: z.number().finite(),
        longitude: z.number().finite(),
        approximate: z.boolean(),
        icon: z.string().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      }),
    ),
  }),
});

const mapErrorMessage = "No pudimos cargar los establecimientos del mapa.";

export async function getMapEstablishments(
  viewport: GeoBounds | null = null,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<MapEstablishmentsResult> {
  const params = new URLSearchParams();
  if (viewport) {
    params.set("west", String(viewport.west));
    params.set("south", String(viewport.south));
    params.set("east", String(viewport.east));
    params.set("north", String(viewport.north));
  }
  const query = params.toString();
  const response = await sendRequest(
    `${apiUrl}/establishments/map${query ? `?${query}` : ""}`,
    {
      errorMessage: mapErrorMessage,
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
    },
  );
  // The map layer is additive and older API deployments do not expose this
  // route yet. Keep public discovery usable until that deployment is updated.
  if (response.status === 404) return { items: [] };
  await assertResponseOk(response, { errorMessage: mapErrorMessage });
  const payload = await parseJsonResponse(
    response,
    mapResponseSchema,
    "Los establecimientos del mapa tienen un formato inválido.",
  );
  return payload.data;
}

export async function getNearbyEstablishments(
  query: NearbyEstablishmentsQuery,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<NearbyEstablishmentsResult> {
  const params = new URLSearchParams();
  params.set("activity", query.activity.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.localityId !== undefined) {
    params.set("localityId", String(query.localityId));
  }
  if (query.latitude !== undefined)
    params.set("latitude", String(query.latitude));
  if (query.longitude !== undefined)
    params.set("longitude", String(query.longitude));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  const payload = await requestJson(
    `${apiUrl}/establishments/nearby?${params}`,
    responseSchema,
    {
      errorMessage: "No pudimos buscar establecimientos turísticos.",
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
      invalidMessage: "El catastro no tiene el formato esperado.",
    },
  );
  return payload.data;
}
