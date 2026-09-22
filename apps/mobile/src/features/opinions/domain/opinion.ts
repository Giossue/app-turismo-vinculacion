import { z } from "zod";

const ratingSchema = z.number().int().min(1).max(5).nullable();

export const publicOpinionSchema = z.object({
  authorName: z.string(),
  rating: ratingSchema,
  comment: z.string().nullable(),
  publishedAt: z.string(),
});

export const publicOpinionPageSchema = z.object({
  items: z.array(publicOpinionSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  summary: z.object({
    total: z.number().int().nonnegative(),
    totalRatings: z.number().int().nonnegative(),
    averageRating: z.number().finite().nullable(),
    distribution: z.object({
      "1": z.number().int().nonnegative(),
      "2": z.number().int().nonnegative(),
      "3": z.number().int().nonnegative(),
      "4": z.number().int().nonnegative(),
      "5": z.number().int().nonnegative(),
    }),
  }),
});

const opinionVersionSchema = z.object({
  rating: ratingSchema,
  comment: z.string().nullable(),
  version: z.number().int().positive(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
});

export const ownOpinionStateSchema = z.object({
  status: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]),
  current: opinionVersionSchema.nullable(),
  pending: opinionVersionSchema.nullable(),
  lastRejected: opinionVersionSchema
    .extend({ reason: z.string().nullable() })
    .nullable(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
});

/** What a tourist submits: a rating, a comment or both. */
export type OpinionContent = Readonly<{
  rating: number | null;
  comment: string;
}>;

export type PublicOpinion = Readonly<z.infer<typeof publicOpinionSchema>>;
export type PublicOpinionPage = Readonly<
  z.infer<typeof publicOpinionPageSchema>
>;
export type OpinionRatingSummary = Pick<
  PublicOpinionPage["summary"],
  "averageRating" | "total"
>;
export type OpinionVersion = Readonly<z.infer<typeof opinionVersionSchema>>;
export type OwnOpinionState = Readonly<z.infer<typeof ownOpinionStateSchema>>;
