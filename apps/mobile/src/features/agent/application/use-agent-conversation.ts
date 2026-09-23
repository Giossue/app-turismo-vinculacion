import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/core/api/http";
import { useUserLocation } from "@/core/location/use-user-location";
import { useAuth } from "@/features/auth/application/auth-context";
import { askTourismAgentStream } from "../data/agent-api";
import type {
  AgentMessage,
  AgentResponse,
  StartRouteAction,
} from "../domain/agent";
import {
  agentFallbackErrorMessage,
  agentIntroMessage,
  buildAgentHistory,
} from "../domain/agent-conversation";

/**
 * One chat with the tourism agent: the bubbles, the streaming answer and
 * the route proposal awaiting confirmation. Closing the chat (unmounting)
 * aborts the answer in progress.
 */
export function useAgentConversation() {
  const auth = useAuth();
  const { accuracy, coordinate } = useUserLocation();
  const [messages, setMessages] = useState<readonly AgentMessage[]>([
    agentIntroMessage,
  ]);
  const [sending, setSending] = useState(false);
  const [awaitingText, setAwaitingText] = useState(false);
  const [pendingRouteAction, setPendingRouteAction] =
    useState<StartRouteAction | null>(null);
  const nextIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const createId = (prefix: string) => {
    nextIdRef.current += 1;
    return `${prefix}-${nextIdRef.current}`;
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const history = buildAgentHistory(messages);
    const question: AgentMessage = {
      id: createId("user"),
      role: "user",
      text: message,
    };
    const answerId = createId("assistant");

    setPendingRouteAction(null);
    setSending(true);
    setAwaitingText(true);
    setMessages((current) => [...current, question]);

    const showText = (partial: string) => {
      if (!partial || controller.signal.aborted) return;
      setAwaitingText(false);
      setMessages((current) =>
        upsertMessage(current, {
          id: answerId,
          kind: "partial",
          role: "assistant",
          text: partial,
        }),
      );
    };

    try {
      const answer = await askTourismAgentStream(message, history, showText, {
        fetcher: auth.request,
        location: coordinate
          ? {
              accuracyMeters: accuracy ?? undefined,
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            }
          : undefined,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setMessages((current) =>
        upsertMessage(current, toCompleteMessage(answerId, answer)),
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      // Only API errors carry a message meant for the tourist.
      const failure: AgentMessage = {
        id: createId("error"),
        kind: "error",
        role: "assistant",
        text:
          error instanceof ApiError ? error.message : agentFallbackErrorMessage,
      };
      setMessages((current) => [...current, failure]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) {
        setSending(false);
        setAwaitingText(false);
      }
    }
  };

  return {
    /** True until the first words of the answer arrive. */
    awaitingText: sending && awaitingText,
    messages,
    pendingRouteAction,
    send,
    sending,
    setPendingRouteAction,
  };
}

/** Replaces the bubble with the same id, or appends it. */
function upsertMessage(
  messages: readonly AgentMessage[],
  message: AgentMessage,
): readonly AgentMessage[] {
  return messages.some((item) => item.id === message.id)
    ? messages.map((item) => (item.id === message.id ? message : item))
    : [...messages, message];
}

function toCompleteMessage(id: string, answer: AgentResponse): AgentMessage {
  return {
    actions: answer.actions,
    cards: answer.cards,
    id,
    itinerary: answer.itinerary,
    role: "assistant",
    sources: answer.sources,
    text: answer.text,
  };
}
