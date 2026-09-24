import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  ApiError,
  assertResponseOk,
  sendRequest,
  type ApiRequestOptions,
} from "@/core/api/http";
import {
  AGENT_HISTORY_MAX_ITEMS,
  AGENT_MAX_ACCURACY_METERS,
  AGENT_MESSAGE_MAX_LENGTH,
  agentHistoryItemSchema,
  agentLocationSchema,
  agentResponseSchema,
  type AgentHistoryItem,
  type AgentLocation,
  type AgentResponse,
} from "../domain/agent";

const streamEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("text-delta"),
      text: z.string().max(4_000),
    })
    .strict(),
  z
    .object({
      type: z.literal("complete"),
      response: agentResponseSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      message: z.string().trim().min(1).max(240),
    })
    .strict(),
]);

const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(AGENT_MESSAGE_MAX_LENGTH),
    history: z.array(agentHistoryItemSchema).max(AGENT_HISTORY_MAX_ITEMS),
    location: agentLocationSchema.optional(),
    conversationId: z.uuid().optional(),
  })
  .strict();

const AGENT_UNAVAILABLE_MESSAGE =
  "El agente no está disponible en este momento.";
export const AGENT_INVALID_FORMAT_MESSAGE =
  "El agente devolvió una respuesta con formato inválido.";
const incompleteMessage = "El agente devolvió una respuesta incompleta.";

/**
 * `fetcher` should be the authenticated `request` from `useAuth()`.
 * `location` is rounded to ~100 m before it leaves the device; `signal`
 * stops the request and the event stream.
 */
export type AgentRequestOptions = ApiRequestOptions &
  Readonly<{ location?: AgentLocation; conversationId?: string }>;

/**
 * Validated JSON body of a chat request. Throws a `ZodError` when the
 * message or history break the API contract.
 */
export function buildAgentRequestBody(
  message: string,
  history: readonly AgentHistoryItem[],
  location?: AgentLocation,
  conversationId?: string,
) {
  return requestSchema.parse({
    message,
    history,
    location: location ? approximateLocation(location) : undefined,
    conversationId,
  });
}

/**
 * Asks the agent through its SSE endpoint. `onText` receives the answer's
 * cumulative text as it is generated; the promise resolves with the final
 * structured response. Failures reject with an `ApiError` whose message is
 * safe to show.
 */
export async function askTourismAgentStream(
  message: string,
  history: readonly AgentHistoryItem[],
  onText: (text: string) => Promise<void> | void,
  {
    apiUrl = getApiUrl(),
    fetcher,
    location,
    conversationId,
    signal,
  }: AgentRequestOptions = {},
): Promise<AgentResponse> {
  const response = await sendRequest(`${apiUrl}/ai/chat/stream`, {
    errorMessage: AGENT_UNAVAILABLE_MESSAGE,
    fetcher,
    init: {
      body: JSON.stringify(
        buildAgentRequestBody(message, history, location, conversationId),
      ),
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal,
    },
  });
  await assertResponseOk(response, { errorMessage: AGENT_UNAVAILABLE_MESSAGE });
  if (!response.body) throw new ApiError(AGENT_INVALID_FORMAT_MESSAGE);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer: AgentResponse | undefined;
  // Some fetch implementations ignore the signal once the body is streaming.
  const cancelOnAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", cancelOnAbort, { once: true });

  const handleEvent = async (event: string): Promise<void> => {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n")
      .trim();
    if (!data || data === "[DONE]") return;

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new ApiError(AGENT_INVALID_FORMAT_MESSAGE);
    }
    const parsed = streamEventSchema.safeParse(payload);
    if (!parsed.success) throw new ApiError(AGENT_INVALID_FORMAT_MESSAGE);

    if (parsed.data.type === "text-delta") {
      await onText(parsed.data.text);
      return;
    }
    if (parsed.data.type === "error") {
      throw new ApiError(parsed.data.message);
    }
    answer = parsed.data.response;
  };

  const consumeEvents = async (flush: boolean): Promise<void> => {
    buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      await handleEvent(event);
      separatorIndex = buffer.indexOf("\n\n");
    }
    if (flush && buffer.trim()) {
      await handleEvent(buffer);
      buffer = "";
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      await consumeEvents(false);
    }
    buffer += decoder.decode();
    await consumeEvents(true);
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    // Un corte de red a mitad de la respuesta no debe mostrar texto técnico.
    if (error instanceof TypeError) {
      throw new ApiError(AGENT_UNAVAILABLE_MESSAGE, { cause: error });
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }

  if (!answer) throw new ApiError(incompleteMessage);
  return answer;
}

function approximateLocation(location: AgentLocation): AgentLocation {
  return {
    accuracyMeters:
      location.accuracyMeters === undefined
        ? undefined
        : Math.min(location.accuracyMeters, AGENT_MAX_ACCURACY_METERS),
    latitude: roundCoordinate(location.latitude),
    longitude: roundCoordinate(location.longitude),
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
