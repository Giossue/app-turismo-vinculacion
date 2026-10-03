import type { TurismoIconName } from "@/core/ui/turismo-icons";
import {
  AGENT_HISTORY_MAX_ITEMS,
  AGENT_MAX_USER_MESSAGES,
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
];

/** The starter prompts stay until the conversation has a question. */
export function showsAgentStarterPrompts(
  messages: readonly AgentMessage[],
): boolean {
  return messages.every((message) => message.role !== "user");
}

/** Shown when a failure has no user-safe message of its own. */
export const agentFallbackErrorMessage =
  "Ahora no puedo responder. Inténtalo de nuevo.";

export function countAgentUserMessages(
  messages: readonly AgentMessage[],
): number {
  return messages.filter((message) => message.role === "user").length;
}

export function hasAgentMessageLimit(
  messages: readonly AgentMessage[],
): boolean {
  return countAgentUserMessages(messages) >= AGENT_MAX_USER_MESSAGES;
}

/** Starts a question, or replaces only the answer when retrying an existing turn. */
export function prepareAgentTurn(
  messages: readonly AgentMessage[],
  text: string,
  ids: Readonly<{
    questionId: string;
    answerId: string;
    retryAnswerId?: string;
  }>,
): {
  question: AgentMessage;
  answerId: string;
  history: AgentHistoryItem[];
  messages: readonly AgentMessage[];
} | null {
  const message = text.trim();
  if (!message) return null;

  if (ids.retryAnswerId) {
    const answerIndex = messages.findIndex(
      (item) => item.id === ids.retryAnswerId,
    );
    const answer = messages[answerIndex];
    const question = messages[answerIndex - 1];
    if (
      answer?.role !== "assistant" ||
      question?.role !== "user" ||
      question.text !== message ||
      (answer.kind !== "error" &&
        !answer.actions?.some((action) => action.type === "request_location"))
    )
      return null;

    return {
      question,
      answerId: answer.id,
      history: buildAgentHistory(messages.slice(0, answerIndex - 1)),
      messages: messages.map((item) =>
        item.id === answer.id
          ? { id: answer.id, role: "assistant", kind: "partial", text: "" }
          : item,
      ),
    };
  }

  if (hasAgentMessageLimit(messages)) return null;
  const question: AgentMessage = {
    id: ids.questionId,
    role: "user",
    text: message,
  };
  return {
    question,
    answerId: ids.answerId,
    history: buildAgentHistory(messages),
    messages: [...messages, question],
  };
}

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
): { question: string; answerId: string } | null {
  const answer = messages.at(-1);
  const question = messages.at(-2);
  if (answer?.kind !== "error" || question?.role !== "user") return null;
  return { question: question.text, answerId: answer.id };
}

/** Share the current position only when this question explicitly needs it. */
export function shouldShareAgentLocation(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const nearby =
    /\b(cerca|cercanos?|cercanas?|alrededor|proximos?|proximas?|aqui cerca|desde aqui|mi ubicacion|near|nearby|around me|my location|from here)\b/.test(
      normalized,
    );
  const namedOrigin =
    /\b(desde|(?:llegar|llego|viajar|viaje|ir|ruta|tiempo|tarda|toma|demora) de) (?!aqui\b|aca\b|mi\b|donde\b).+? (a|al|hasta|hacia) (?!pie\b|bici\b|bicicleta\b|carro\b|auto\b|coche\b)\S/.test(
      normalized,
    ) ||
    /\bentre .+? y \S/.test(normalized) ||
    /\bfrom (?!here\b|my\b).+? to \S/.test(normalized);
  const explicitTravelTime =
    /\b((a|en) cuantos? minutos?|tiempo (de viaje|de llegada|para llegar)|como (llego|llegar)|how many minutes|travel time)\b/.test(
      normalized,
    );
  const timeQuestion =
    /\b(cuanto (tiempo )?(me |se )?(tardo|tarda|tardaria|demoro|demora|toma|tomaria)|how long)\b/.test(
      normalized,
    );
  const journey =
    /\b(llegar|llego|ir|viajar|caminando|conduciendo|get (there|to)|reach|walk|drive|cycle|travel)\b/.test(
      normalized,
    );
  return (
    nearby ||
    (!namedOrigin && (explicitTravelTime || (timeQuestion && journey)))
  );
}

function toHistoryContent(text: string): string {
  return text.trim().slice(0, AGENT_MESSAGE_MAX_LENGTH);
}
