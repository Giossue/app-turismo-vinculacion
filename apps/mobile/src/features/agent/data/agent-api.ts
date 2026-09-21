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
