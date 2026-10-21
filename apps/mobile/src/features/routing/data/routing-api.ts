import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { ApiError, requestJson, type ApiRequestOptions } from "@/core/api/http";
import {
  routeModes,
  type CalculatedRoute,
  type RouteRequest,
} from "../domain/routing";
import { messages } from "@/core/i18n/language";

export const calculatedRouteSchema = z.object({
  mode: z.enum(routeModes),
  distanceMeters: z.number().finite(),
  durationSeconds: z.number().finite(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number().finite(), z.number().finite()])),
  }),
  steps: z.array(
    z.object({
      instruction: z.string().min(1),
      distanceMeters: z.number().finite(),
      durationSeconds: z.number().finite(),
      name: z.string().nullable(),
      maneuver: z.object({
        type: z.string(),
        modifier: z.string().nullable(),
        exit: z.number().int().positive().nullable(),
      }),
    }),
  ),
});

const routeResponseSchema = z.object({ data: calculatedRouteSchema });

/** User-facing copy for a failed route calculation; never raw error text. */
export function getRouteErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : messages().routing.errors.calculate;
}

export async function calculateRoute(
  request: RouteRequest,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<CalculatedRoute> {
  const text = messages().routing.errors;
  const payload = await requestJson(
    `${apiUrl}/routing/route`,
    routeResponseSchema,
    {
      errorMessage: text.calculate,
      timeoutMs: 30_000,
      fetcher,
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      },
      invalidMessage: text.invalidResponse,
      statusMessages: {
        422: text.noRoute,
        503: text.unavailable,
      },
    },
  );
  return payload.data;
}
