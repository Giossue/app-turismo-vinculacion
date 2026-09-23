import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  requestJson,
  type ApiRequestOptions,
} from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import {
  ownOpinionStateSchema,
  publicOpinionPageSchema,
  type OpinionContent,
  type OpinionPageRequest,
  type OwnOpinionState,
  type PublicOpinionPage,
} from "../domain/opinion";

const listSchema = z.object({ data: publicOpinionPageSchema });
const ownSchema = z.object({ data: ownOpinionStateSchema.nullable() });
const submittedSchema = z.object({ data: ownOpinionStateSchema });

/** One page of published opinions, newest first (the API's order). */
export async function listCenterOpinions(
  code: string,
  { limit, offset }: OpinionPageRequest,
  { apiUrl = getApiUrl(), fetcher = fetch, signal }: ApiRequestOptions = {},
): Promise<PublicOpinionPage> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const payload = await requestJson(
    `${apiUrl}/centers/${encodeURIComponent(code)}/opinions?${query}`,
    listSchema,
    {
      errorMessage: "No se pudieron cargar las opiniones.",
      fetcher,
      init: { headers: acceptJsonHeaders, signal },
      invalidMessage: "Las opiniones no tienen el formato esperado.",
    },
  );
  return payload.data;
}

export async function getMyCenterOpinion(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<OwnOpinionState | null> {
  const payload = await requestJson(
    `${apiUrl}/opinions/me/centers/${encodeURIComponent(code)}`,
    ownSchema,
    {
      errorMessage: "No se pudo cargar tu opinión.",
      fetcher: request,
      invalidMessage: "El estado de tu opinión no tiene el formato esperado.",
    },
  );
  return payload.data;
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
  const payload = await requestJson(
    `${apiUrl}/opinions/centers/${encodeURIComponent(code)}`,
    submittedSchema,
    {
      errorMessage: "No se pudo guardar tu opinión.",
      fetcher: request,
      init: {
        body: JSON.stringify({
          ...(content.rating === null ? {} : { rating: content.rating }),
          ...(content.comment.trim()
            ? { comment: content.comment.trim() }
            : {}),
        }),
        headers: { "content-type": "application/json" },
        method,
      },
      invalidMessage: "La API no devolvió el estado de tu opinión.",
      useServerMessage: true,
    },
  );
  return payload.data;
}
