import { useCallback, useEffect, useRef, useState } from "react";

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
  getRetryableAgentTurn,
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
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<readonly AgentMessage[]>([agentIntroMessage]);
  const [sending, setSending] = useState(false);
  const [awaitingText, setAwaitingText] = useState(false);
  const [pendingRouteAction, setPendingRouteAction] =
    useState<StartRouteAction | null>(null);
  const nextIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const answerIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const userIdRef = useRef(auth.user?.id);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessages = (
    update: (current: readonly AgentMessage[]) => readonly AgentMessage[],
  ) => {
    const next = update(messagesRef.current);
    messagesRef.current = next;
    setMessages(next);
  };

  const cancel = useCallback(() => {
    const controller = abortRef.current;
    if (!controller) return;
    controller.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    setAwaitingText(false);
    const answerId = answerIdRef.current;
    answerIdRef.current = null;
    if (answerId) {
      const next = upsertMessage(messagesRef.current, {
        id: answerId,
        kind: "error",
        role: "assistant",
        text: "Respuesta detenida.",
      });
      messagesRef.current = next;
      setMessages(next);
    }
  }, []);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    answerIdRef.current = null;
    sendingRef.current = false;
    messagesRef.current = [agentIntroMessage];
    setMessages(messagesRef.current);
    setSending(false);
    setAwaitingText(false);
    setPendingRouteAction(null);
    setDraft("");
  }, []);

  useEffect(() => {
    if (userIdRef.current === auth.user?.id) return;
    userIdRef.current = auth.user?.id;
    newConversation();
  }, [auth.user?.id, newConversation]);

  const createId = (prefix: string) => {
    nextIdRef.current += 1;
    return `${prefix}-${nextIdRef.current}`;
  };

  const send = async (
    text: string,
    baseMessages: readonly AgentMessage[] = messagesRef.current,
  ) => {
    const message = text.trim();
    if (!message || sendingRef.current) return;
    sendingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const history = buildAgentHistory(baseMessages);
    const question: AgentMessage = {
      id: createId("user"),
      role: "user",
      text: message,
    };
    const answerId = createId("assistant");
    answerIdRef.current = answerId;

    setPendingRouteAction(null);
    setSending(true);
    setAwaitingText(true);
    updateMessages(() => [...baseMessages, question]);

    const showText = (partial: string) => {
      if (!partial || controller.signal.aborted) return;
      setAwaitingText(false);
      updateMessages((current) =>
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
      updateMessages((current) =>
        upsertMessage(current, toCompleteMessage(answerId, answer)),
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      // Only API errors carry a message meant for the tourist.
      const failure: AgentMessage = {
        id: answerId,
        kind: "error",
        role: "assistant",
        text:
          error instanceof ApiError ? error.message : agentFallbackErrorMessage,
      };
      updateMessages((current) => upsertMessage(current, failure));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        answerIdRef.current = null;
        sendingRef.current = false;
        setSending(false);
        setAwaitingText(false);
      }
    }
  };

  const retry = () => {
    if (sendingRef.current) return;
    const turn = getRetryableAgentTurn(messagesRef.current);
    if (turn) void send(turn.question, turn.previous);
  };

  return {
    /** True until the first words of the answer arrive. */
    awaitingText: sending && awaitingText,
    cancel,
    draft,
    messages,
    newConversation,
    pendingRouteAction,
    retry,
    send,
    sending,
    setDraft,
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
