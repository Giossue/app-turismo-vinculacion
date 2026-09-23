import {
  AGENT_HISTORY_MAX_ITEMS,
  AGENT_MESSAGE_MAX_LENGTH,
  type AgentHistoryItem,
  type AgentMessage,
} from "./agent";

export const agentIntroMessage: AgentMessage = {
  id: "assistant-intro",
  kind: "intro",
  role: "assistant",
  text: "¡Hola! Puedo ayudarte a encontrar lugares para visitar, negocios y servicios cercanos, resolver tus dudas y preparar una ruta. ¿Qué estás buscando?",
};

/** Shown when a failure has no user-safe message of its own. */
export const agentFallbackErrorMessage = "No pudimos responder ahora.";

/**
 * Context for the next question: the latest completed exchanges only. A
 * user message counts when the next bubble is a complete answer; the
 * greeting, errors and answers cut off mid-stream are left out.
 */
export function buildAgentHistory(
  messages: readonly AgentMessage[],
): AgentHistoryItem[] {
  const history: AgentHistoryItem[] = [];
  messages.forEach((message, index) => {
    const answer = messages[index + 1];
    if (
      message.role !== "user" ||
      answer?.role !== "assistant" ||
      answer.kind !== undefined
    ) {
      return;
    }
    const question = toHistoryContent(message.text);
    const reply = toHistoryContent(answer.text);
    if (!question || !reply) return;
    history.push(
      { role: "user", content: question },
      { role: "assistant", content: reply },
    );
  });
  return history.slice(-AGENT_HISTORY_MAX_ITEMS);
}

function toHistoryContent(text: string): string {
  return text.trim().slice(0, AGENT_MESSAGE_MAX_LENGTH);
}
