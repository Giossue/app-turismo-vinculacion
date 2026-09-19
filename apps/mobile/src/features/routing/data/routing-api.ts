import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { CalculatedRoute, RouteRequest } from "../domain/routing";

const routeSchema = z.object({
  data: z.object({
    mode: z.enum(["car", "bicycle", "foot"]),
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
  }),
});

export async function calculateRoute(
  request: RouteRequest,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
  signal?: AbortSignal,
): Promise<CalculatedRoute> {
  const response = await fetcher(`${apiUrl}/routing/route`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("No encontramos una ruta posible entre esos puntos.");
    }
    if (response.status === 503) {
      throw new Error("El servicio de rutas no está disponible ahora.");
    }
    throw new Error("No pudimos calcular la ruta.");
  }

  const payload = routeSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("La respuesta de rutas no tiene el formato esperado.");
  }
  return payload.data.data;
}
