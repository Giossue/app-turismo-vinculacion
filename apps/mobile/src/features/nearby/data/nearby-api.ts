import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  requestJson,
  type ApiRequestOptions,
} from "@/core/api/http";
import type { NearbyPlace, NearbyPlacesQuery } from "../domain/nearby-place";
import { messages } from "@/core/i18n/language";

const placeBase = {
  title: z.string().min(1),
  subtitle: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  distanceMeters: z.number().finite().nonnegative(),
};

const responseSchema = z.object({
  data: z.object({
    items: z.array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("center"),
          code: z.string().min(1),
          ...placeBase,
        }),
        z.object({
          kind: z.literal("establishment"),
          id: z.number().int().positive(),
          activity: z.string(),
          ...placeBase,
        }),
      ]),
    ),
  }),
});

/** Centros y catastro publicados alrededor de un punto, del más cercano. */
export async function getNearbyPlaces(
  query: NearbyPlacesQuery,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<readonly NearbyPlace[]> {
  const params = new URLSearchParams({
    latitude: String(query.latitude),
    longitude: String(query.longitude),
    filter: query.filter,
  });
  if (query.radiusMeters !== undefined) {
    params.set("radiusMeters", String(query.radiusMeters));
  }
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  const payload = await requestJson(
    `${apiUrl}/nearby?${params}`,
    responseSchema,
    {
      errorMessage: messages().community.nearby.errors.search,
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
      invalidMessage: messages().community.nearby.errors.invalid,
    },
  );
  return payload.data.items;
}
