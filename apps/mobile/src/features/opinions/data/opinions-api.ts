import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import type {
  OpinionContent,
  OwnOpinionState,
  PublicOpinionPage,
} from "../domain/opinion";

const opinionSchema = z.object({
  authorName: z.string(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  publishedAt: z.string(),
});

const summarySchema = z.object({
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
});

const listSchema = z.object({
  data: z.object({
    items: z.array(opinionSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    summary: summarySchema,
  }),
});

const opinionVersionSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  version: z.number().int().positive(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
});

const ownSchema = z.object({
  data: z
    .object({
      status: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]),
      current: opinionVersionSchema.nullable(),
      pending: opinionVersionSchema.nullable(),
      lastRejected: opinionVersionSchema
        .extend({ reason: z.string().nullable() })
        .nullable(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
    })
    .nullable(),
});

type Fetcher = typeof fetch;

export async function listCenterOpinions(
  code: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<PublicOpinionPage> {
  const response = await fetcher(
    `${apiUrl}/centers/${encodeURIComponent(code)}/opinions`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("No se pudieron cargar las opiniones.");
  const payload = listSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("Las opiniones no tienen el formato esperado.");
  }
  return payload.data.data;
}

export async function getMyCenterOpinion(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<OwnOpinionState | null> {
  const response = await request(
    `${apiUrl}/opinions/me/centers/${encodeURIComponent(code)}`,
  );
  if (!response.ok) throw new Error("No se pudo cargar tu opinión.");
  const payload = ownSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("El estado de tu opinión no tiene el formato esperado.");
  }
  return payload.data.data;
}

export async function createCenterOpinion(
  code: string,
  content: OpinionContent,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<OwnOpinionState> {
  return submitCenterOpinion(code, content, request, "POST", apiUrl);
}

export async function editCenterOpinion(
  code: string,
  content: OpinionContent,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<OwnOpinionState> {
  return submitCenterOpinion(code, content, request, "PATCH", apiUrl);
}

async function submitCenterOpinion(
  code: string,
  content: OpinionContent,
  request: AuthorizedFetcher,
  method: "POST" | "PATCH",
  apiUrl: string,
): Promise<OwnOpinionState> {
  const response = await request(
    `${apiUrl}/opinions/centers/${encodeURIComponent(code)}`,
    {
      body: JSON.stringify({
        ...(content.rating === null ? {} : { rating: content.rating }),
        ...(content.comment.trim() ? { comment: content.comment.trim() } : {}),
      }),
      headers: { "content-type": "application/json" },
      method,
    },
  );
  if (!response.ok) {
    throw new Error(await readError(response, "No se pudo guardar tu opinión."));
  }
  const payload = ownSchema.safeParse(await response.json());
  if (!payload.success || !payload.data.data) {
    throw new Error("La API no devolvió el estado de tu opinión.");
  }
  return payload.data.data;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return body?.error?.message ?? fallback;
}
