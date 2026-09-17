import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";

const agentResponseSchema = z.string();

export type AgentHistoryItem = Readonly<{
  role: "user" | "assistant";
  content: string;
}>;

export async function askTourismAgent(
  message: string,
  history: readonly AgentHistoryItem[] = [],
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<string> {
  const response = await fetcher(`${apiUrl}/ai/chat`, {
    body: JSON.stringify({ message, history }),
    headers: { Accept: "text/plain", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok)
    throw new Error("El agente no está disponible en este momento.");
  const parsed = agentResponseSchema.safeParse(await response.text());
  if (!parsed.success || !parsed.data.trim())
    throw new Error("El agente devolvió una respuesta vacía.");
  return parsed.data.trim();
}
