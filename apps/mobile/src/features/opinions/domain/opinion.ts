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

/** Longest comment the API accepts (`OpinionContentDto`). */
export const OPINION_COMMENT_MAX_LENGTH = 2_000;

/** Page size of the public list; the API accepts up to 50. */
export const OPINIONS_PAGE_SIZE = 20;

export type OpinionPageRequest = Readonly<{ limit: number; offset: number }>;

/**
 * Stable React key for a published opinion. The public API exposes no id;
 * an author publishes at most one current version per place, so the
 * timestamp and the author's name identify it.
 */
export function getOpinionKey(opinion: PublicOpinion): string {
  return `${opinion.publishedAt}|${opinion.authorName}`;
}

/** Offset of the next page, or `undefined` once every opinion is loaded. */
export function getNextOpinionOffset(
  page: PublicOpinionPage,
): number | undefined {
  const next = page.offset + page.items.length;
  return page.items.length > 0 && next < page.total ? next : undefined;
}

/**
 * Joins the loaded pages (newest first) under the first page's summary.
 * Opinions published between page loads shift the offsets, so repeated
 * entries are dropped.
 */
export function mergeOpinionPages(
  pages: readonly [PublicOpinionPage, ...PublicOpinionPage[]],
): PublicOpinionPage {
  const seen = new Set<string>();
  const items: PublicOpinion[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      const key = getOpinionKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return { ...pages[0], items };
}
