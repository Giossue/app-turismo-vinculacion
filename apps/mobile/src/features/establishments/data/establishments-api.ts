import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  requestJson,
  type ApiRequestOptions,
} from "@/core/api/http";
import type {
  NearbyEstablishmentsQuery,
  NearbyEstablishmentsResult,
  PublicEstablishmentDetail,
} from "../domain/establishment";

export const establishmentSchema = z.object({
  id: z.number().int().positive().optional(),
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

const detailSchema = z.object({
  data: establishmentSchema.extend({
    id: z.number().int().positive(),
    photos: z
      .array(
        z.object({
          id: z.number().int().positive(),
          url: z.string().min(1),
          description: z.string().nullable(),
        }),
      )
      .default([]),
  }),
});

/** Published establishment with its photos; 404 once it is unpublished. */
export async function getPublishedEstablishment(
  id: number,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<PublicEstablishmentDetail> {
  const payload = await requestJson(
    `${apiUrl}/establishments/${id}`,
    detailSchema,
    {
      errorMessage: "No pudimos cargar el establecimiento.",
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
      invalidMessage: "El establecimiento no tiene el formato esperado.",
    },
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
