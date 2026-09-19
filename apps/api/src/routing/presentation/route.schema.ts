import { z } from "zod";

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const routeRequestSchema = z
  .object({
    mode: z.enum(["car", "bicycle", "foot"]),
    origin: coordinateSchema,
    destination: coordinateSchema,
  })
  .strict();
