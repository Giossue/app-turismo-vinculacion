import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { requestJson, type ApiRequestOptions } from "@/core/api/http";
import {
  routeModes,
  type CalculatedRoute,
  type RouteRequest,
} from "../domain/routing";

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

export async function calculateRoute(
  request: RouteRequest,
  { apiUrl = getApiUrl(), fetcher, signal }: ApiRequestOptions = {},
): Promise<CalculatedRoute> {
  const payload = await requestJson(
    `${apiUrl}/routing/route`,
    routeResponseSchema,
    {
      errorMessage: "No pudimos calcular la ruta.",
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
      invalidMessage: "La respuesta de rutas no tiene el formato esperado.",
      statusMessages: {
        422: "No encontramos una ruta posible entre esos puntos.",
        503: "El servicio de rutas no está disponible ahora.",
      },
    },
  );
  return payload.data;
}
