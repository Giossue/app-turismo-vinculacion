import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
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
        latitude: z.number().finite(),
        longitude: z.number().finite(),
        approximate: z.boolean(),
        icon: z.string().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      }),
    ),
  }),
});

export async function getMapEstablishments(
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<MapEstablishmentsResult> {
  const response = await fetcher(`${apiUrl}/establishments/map`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("No pudimos cargar los establecimientos del mapa.");
  }
  const payload = mapResponseSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error(
      "Los establecimientos del mapa tienen un formato inválido.",
    );
  }
  return payload.data.data;
}

export async function getNearbyEstablishments(
  query: NearbyEstablishmentsQuery,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
  signal?: AbortSignal,
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

  const response = await fetcher(`${apiUrl}/establishments/nearby?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error("No pudimos buscar establecimientos turísticos.");
  }
  const payload = responseSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("El catastro no tiene el formato esperado.");
  }
  return payload.data.data;
}
