import { z } from "zod";

import { readJson, removeJson, writeJson } from "@/core/storage/json-storage";
import { agentMessageSchema, type AgentMessage } from "../domain/agent";

const storageKeyPrefix = "turismo-vinculacion-agent-chat-v1";

const storedConversationSchema = z
  .object({
    version: z.literal(1),
    conversationId: z.uuid().nullable(),
    messages: z.array(agentMessageSchema).min(1).max(200),
  })
  .strict();

export type StoredAgentConversation = Readonly<{
  conversationId: string | null;
  messages: readonly AgentMessage[];
}>;

/** One chat per account on this device; visitors share the guest slot. */
function storageKey(userId: number | string | undefined) {
  return `${storageKeyPrefix}:${userId ?? "guest"}`;
}

export async function readStoredAgentConversation(
  userId: number | string | undefined,
): Promise<StoredAgentConversation | null> {
  return readJson(storageKey(userId), storedConversationSchema);
}

/**
 * An answer still streaming cannot be resumed after a restart, so it is
 * saved as stopped and can be retried.
 */
export async function writeStoredAgentConversation(
  userId: number | string | undefined,
  conversation: StoredAgentConversation,
): Promise<void> {
  await writeJson(storageKey(userId), {
    version: 1,
    conversationId: conversation.conversationId,
    messages: closeInterruptedAnswer(conversation.messages),
  });
}

export async function removeStoredAgentConversation(
  userId: number | string | undefined,
): Promise<void> {
  await removeJson(storageKey(userId));
}

const interruptedText = "Respuesta interrumpida.";

/** Turns a streaming or missing answer into a retryable error bubble. */
export function closeInterruptedAnswer(
  messages: readonly AgentMessage[],
): readonly AgentMessage[] {
  const closed = messages.map((message): AgentMessage =>
    message.kind === "partial"
      ? {
          id: message.id,
          kind: "error",
          role: "assistant",
          text: interruptedText,
        }
      : message,
  );
  const last = closed.at(-1);
  return last?.role === "user"
    ? [
        ...closed,
        {
          id: `assistant-interrupted-${last.id}`,
          kind: "error",
          role: "assistant",
          text: interruptedText,
        },
      ]
    : closed;
}
