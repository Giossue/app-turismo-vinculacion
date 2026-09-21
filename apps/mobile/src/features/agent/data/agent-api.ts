import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import {
  agentLocationSchema,
  agentResponseSchema,
  type AgentHistoryItem,
  type AgentLocation,
  type AgentResponse,
} from "../domain/agent";

export type {
  AgentHistoryItem,
  AgentLocation,
  AgentResponse,
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
    message: z.string().trim().min(1).max(2_000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(2_000),
          })
          .strict(),
      )
      .max(12),
    location: agentLocationSchema.optional(),
  })
  .strict();

export async function askTourismAgent(
  message: string,
  history: readonly AgentHistoryItem[] = [],
  fetcher: AuthorizedFetcher = fetch,
  apiUrl = getApiUrl(),
  location?: AgentLocation,
): Promise<AgentResponse> {
  const body = requestSchema.parse({
    message,
    history,
    location: location ? approximateLocation(location) : undefined,
  });
  const response = await fetcher(`${apiUrl}/ai/chat`, {
    body: JSON.stringify(body),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok)
    throw new Error("El agente no está disponible en este momento.");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("El agente devolvió una respuesta con formato inválido.");
  }
  const parsed = agentResponseSchema.safeParse(payload);
  if (!parsed.success)
    throw new Error("El agente devolvió una respuesta con formato inválido.");
  return parsed.data;
}

export async function askTourismAgentStream(
  message: string,
  history: readonly AgentHistoryItem[] = [],
  onText: (text: string) => Promise<void> | void,
  fetcher: AuthorizedFetcher = fetch,
  apiUrl = getApiUrl(),
  location?: AgentLocation,
): Promise<AgentResponse> {
  const body = requestSchema.parse({
    message,
    history,
    location: location ? approximateLocation(location) : undefined,
  });
  const response = await fetcher(`${apiUrl}/ai/chat/stream`, {
    body: JSON.stringify(body),
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok)
    throw new Error("El agente no está disponible en este momento.");
  if (!response.body)
    throw new Error("El agente devolvió una respuesta con formato inválido.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer: AgentResponse | undefined;

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
      throw new Error("El agente devolvió una respuesta con formato inválido.");
    }
    const parsed = streamEventSchema.safeParse(payload);
    if (!parsed.success)
      throw new Error("El agente devolvió una respuesta con formato inválido.");

    if (parsed.data.type === "text-delta") {
      await onText(parsed.data.text);
      return;
    }
    if (parsed.data.type === "error") {
      throw new Error(parsed.data.message);
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
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (!answer) throw new Error("El agente devolvió una respuesta incompleta.");
  return answer;
}

function approximateLocation(location: AgentLocation): AgentLocation {
  return {
    accuracyMeters: location.accuracyMeters,
    latitude: roundCoordinate(location.latitude),
    longitude: roundCoordinate(location.longitude),
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
