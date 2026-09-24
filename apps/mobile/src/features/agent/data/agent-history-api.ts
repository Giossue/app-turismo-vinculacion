import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { assertResponseOk, requestJson, sendRequest } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";

const conversationSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const detailSchema = conversationSchema.extend({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
      sources: z.array(
        z.object({
          type: z.enum([
            "center",
            "establishment",
            "poi",
            "transport",
            "routing",
          ]),
          label: z.string(),
        }),
      ),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export type SavedAgentConversation = z.infer<typeof conversationSchema>;
export type SavedAgentConversationDetail = z.infer<typeof detailSchema>;

const preferenceResponseSchema = z.object({
  data: z.object({ enabled: z.boolean() }),
});

export async function getAgentHistoryPreference(
  request: AuthorizedFetcher,
): Promise<boolean> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/history/preferences`,
    preferenceResponseSchema,
    {
      fetcher: request,
      errorMessage: "No se pudo consultar el historial.",
      invalidMessage:
        "La preferencia de historial no tiene el formato esperado.",
    },
  );
  return payload.data.enabled;
}

export async function setAgentHistoryPreference(
  enabled: boolean,
  request: AuthorizedFetcher,
): Promise<boolean> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/history/preferences`,
    preferenceResponseSchema,
    {
      fetcher: request,
      errorMessage: "No se pudo cambiar el historial.",
      invalidMessage:
        "La preferencia de historial no tiene el formato esperado.",
      init: {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      },
    },
  );
  return payload.data.enabled;
}

export async function listAgentHistory(
  request: AuthorizedFetcher,
): Promise<readonly SavedAgentConversation[]> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/history`,
    z.object({ data: z.array(conversationSchema) }),
    {
      fetcher: request,
      errorMessage: "No se pudieron cargar tus conversaciones.",
      invalidMessage: "Las conversaciones no tienen el formato esperado.",
    },
  );
  return payload.data;
}

export async function getSavedAgentConversation(
  id: string,
  request: AuthorizedFetcher,
): Promise<SavedAgentConversationDetail> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/history/${encodeURIComponent(id)}`,
    z.object({ data: detailSchema }),
    {
      fetcher: request,
      errorMessage: "No se pudo abrir la conversación.",
      invalidMessage: "La conversación no tiene el formato esperado.",
    },
  );
  return payload.data;
}

export async function deleteSavedAgentConversation(
  id: string,
  request: AuthorizedFetcher,
): Promise<void> {
  const errorMessage = "No se pudo eliminar la conversación.";
  const response = await sendRequest(
    `${getApiUrl()}/ai/history/${encodeURIComponent(id)}`,
    {
      fetcher: request,
      errorMessage,
      init: { method: "DELETE" },
    },
  );
  await assertResponseOk(response, { errorMessage });
}
