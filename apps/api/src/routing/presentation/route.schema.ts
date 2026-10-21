import { z } from "zod";

import { maxRouteWaypoints } from "../domain/route";

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const routeRequestSchema = z
  .object({
    mode: z.enum(["car", "bicycle", "foot"]),
    origin: coordinateSchema,
    waypoints: z
      .array(coordinateSchema)
      .max(
        maxRouteWaypoints,
        `Un recorrido admite hasta ${maxRouteWaypoints} paradas intermedias.`,
      )
      .optional(),
    destination: coordinateSchema,
  })
  .strict();
