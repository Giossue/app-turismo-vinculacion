import { z } from "zod";

/** Filtros fijos de «Cerca de mí»; el servidor decide qué significa cada uno. */
export const nearbyFilters = ["all", "attractions", "food", "lodging"] as const;
export type NearbyFilter = (typeof nearbyFilters)[number];

export const nearbyDefaultRadiusMeters = 5_000;
export const nearbyMaxRadiusMeters = 20_000;
export const nearbyDefaultLimit = 20;
export const nearbyMaxLimit = 50;

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  radiusMeters: z.coerce
    .number()
    .int()
    .min(100)
    .max(nearbyMaxRadiusMeters)
    .default(nearbyDefaultRadiusMeters),
  filter: z.enum(nearbyFilters).default("all"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(nearbyMaxLimit)
    .default(nearbyDefaultLimit),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
