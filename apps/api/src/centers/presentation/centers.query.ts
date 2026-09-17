import { z } from "zod";

const coordinate = z.coerce.number().finite();

export const listCentersQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    west: coordinate.optional(),
    south: coordinate.optional(),
    east: coordinate.optional(),
    north: coordinate.optional(),
    categoryCode: z.string().trim().min(1).max(30).optional(),
    typeCode: z.string().trim().min(1).max(30).optional(),
    subtypeCode: z.string().trim().min(1).max(30).optional(),
    provinceCode: z.string().trim().min(1).max(10).optional(),
    cantonCode: z.string().trim().min(1).max(10).optional(),
    parishCode: z.string().trim().min(1).max(10).optional(),
    hierarchyCode: z.string().trim().min(1).max(10).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .superRefine((value, ctx) => {
    const coordinates = [value.west, value.south, value.east, value.north];
    const supplied = coordinates.filter((item) => item !== undefined).length;
    if (supplied !== 0 && supplied !== 4) {
      ctx.addIssue({
        code: "custom",
        message: "El viewport requiere west, south, east y north.",
      });
    }
    if (
      supplied === 4 &&
      (value.west! >= value.east! || value.south! >= value.north!)
    ) {
      ctx.addIssue({ code: "custom", message: "El viewport no es válido." });
    }
  });
