import type { TurismoIconName } from "@/core/ui/turismo-icons";
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
  text: "¡Hola! Soy tu guía turístico. ¿Qué estás buscando?",
};

/** A common first question; tapping it sends its text as the message. */
export type AgentStarterPrompt = Readonly<{
  icon: TurismoIconName;
  text: string;
}>;

/** Offered under the greeting until the first question is sent. */
export const agentStarterPrompts: readonly AgentStarterPrompt[] = [
  { icon: "landmark", text: "¿Qué lugares turísticos puedo visitar?" },
  { icon: "restaurant", text: "¿Dónde puedo comer?" },
  { icon: "hotel", text: "¿Dónde puedo hospedarme?" },
  { icon: "mapPin", text: "¿Qué hay cerca de mí?" },
  { icon: "calendar", text: "Arma un plan para mi día" },
];

/** The starter prompts stay until the conversation has a question. */
export function showsAgentStarterPrompts(
  messages: readonly AgentMessage[],
): boolean {
  return messages.every((message) => message.role !== "user");
}

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

/** The final failed turn can be sent again without duplicating its question. */
export function getRetryableAgentTurn(
  messages: readonly AgentMessage[],
): { question: string; previous: readonly AgentMessage[] } | null {
  const answer = messages.at(-1);
  const question = messages.at(-2);
  if (answer?.kind !== "error" || question?.role !== "user") return null;
  return { question: question.text, previous: messages.slice(0, -2) };
}

/** Share the current position only when this question explicitly needs it. */
export function shouldShareAgentLocation(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /\b(cerca|cercanos?|cercanas?|alrededor|proximos?|proximas?|aqui cerca|desde aqui|mi ubicacion|near|nearby|around me|my location|from here)\b/.test(
    normalized,
  );
}

function toHistoryContent(text: string): string {
  return text.trim().slice(0, AGENT_MESSAGE_MAX_LENGTH);
}
