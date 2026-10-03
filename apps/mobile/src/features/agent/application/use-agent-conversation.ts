import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/core/api/http";
import type { GeoCoordinate } from "@/core/geo/types";
import { getLocationAvailability } from "@/core/location/location-availability";
import { useUserLocation } from "@/core/location/use-user-location";
import { useAuth } from "@/features/auth/application/auth-context";
import { askTourismAgentStream } from "../data/agent-api";
import type { AgentMessage, AgentResponse } from "../domain/agent";
import {
  agentFallbackErrorMessage,
  agentIntroMessage,
  countAgentUserMessages,
  hasAgentMessageLimit,
  prepareAgentTurn,
  getRetryableAgentTurn,
  shouldShareAgentLocation,
} from "../domain/agent-conversation";

/**
 * One chat with the tourism agent: the bubbles and the streaming answer.
 * Closing the chat (unmounting) aborts the answer in progress.
 */
export function useAgentConversation() {
  const auth = useAuth();
  const { accuracy, coordinate, requestLocation } = useUserLocation();
  const [messages, setMessages] = useState<readonly AgentMessage[]>([
    agentIntroMessage,
  ]);
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<readonly AgentMessage[]>([agentIntroMessage]);
  const [sending, setSending] = useState(false);
  const [awaitingText, setAwaitingText] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const nextIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const answerIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const userIdRef = useRef(auth.user?.id);
  const locationRequestRef = useRef(false);
  const locationRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      locationRequestIdRef.current += 1;
      abortRef.current?.abort();
    },
    [],
  );

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
    locationRequestIdRef.current += 1;
    locationRequestRef.current = false;
    setRequestingLocation(false);
    setLocationFeedback(null);
    abortRef.current?.abort();
    abortRef.current = null;
    answerIdRef.current = null;
    conversationIdRef.current = null;
    sendingRef.current = false;
    messagesRef.current = [agentIntroMessage];
    setMessages(messagesRef.current);
    setSending(false);
    setAwaitingText(false);
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

  const sendTurn = async (
    text: string,
    retryAnswerId?: string,
    locationOverride?: GeoCoordinate,
  ) => {
    if (sendingRef.current || (locationRequestRef.current && !locationOverride))
      return;
    const turn = prepareAgentTurn(messagesRef.current, text, {
      questionId: createId("user"),
      answerId: createId("assistant"),
      retryAnswerId,
    });
    if (!turn) return;
    const { answerId, history } = turn;
    const message = turn.question.text;
    sendingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    answerIdRef.current = answerId;

    setSending(true);
    setAwaitingText(true);
    setLocationFeedback(null);
    updateMessages(() => turn.messages);

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
      let currentCoordinate: GeoCoordinate | null | undefined =
        locationOverride ?? coordinate;
      const needsCurrentLocation = shouldShareAgentLocation(message);
      if (needsCurrentLocation && !currentCoordinate) {
        // Un permiso ya concedido no implica que el mapa haya leído el GPS.
        // Recuperamos la posición al pedir cercanía, sin volver a solicitar
        // permiso del sistema hasta que la persona toque la acción del agente.
        try {
          if ((await getLocationAvailability()) === "available") {
            currentCoordinate = (await requestLocation()) ?? undefined;
          }
        } catch {
          // La respuesta local ofrecerá volver a intentar la lectura.
        }
      }
      if (controller.signal.aborted) return;
      if (needsCurrentLocation && !currentCoordinate) {
        updateMessages((current) =>
          upsertMessage(current, {
            id: answerId,
            role: "assistant",
            text: "Necesito tu ubicación para buscar cerca de ti o calcular tiempos. Toca «Usar mi ubicación».",
            actions: [{ type: "request_location" }],
          }),
        );
        return;
      }
      const answer = await askTourismAgentStream(message, history, showText, {
        fetcher: auth.request,
        conversationId: conversationIdRef.current ?? undefined,
        location:
          currentCoordinate && needsCurrentLocation
            ? {
                accuracyMeters: accuracy ?? undefined,
                latitude: currentCoordinate.latitude,
                longitude: currentCoordinate.longitude,
              }
            : undefined,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (answer.conversationId)
        conversationIdRef.current = answer.conversationId;
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

  const requestLocationForMessage = async (answerId: string) => {
    if (sendingRef.current || locationRequestRef.current) return;
    const answerIndex = messagesRef.current.findIndex(
      (item) => item.id === answerId,
    );
    const answer = messagesRef.current[answerIndex];
    const question = messagesRef.current[answerIndex - 1];
    if (
      answerIndex < 1 ||
      answer?.role !== "assistant" ||
      !answer.actions?.some((action) => action.type === "request_location") ||
      question?.role !== "user"
    ) {
      return;
    }
    const requestId = ++locationRequestIdRef.current;
    locationRequestRef.current = true;
    setRequestingLocation(true);
    setLocationFeedback(null);
    try {
      const position = await requestLocation();
      if (!mountedRef.current || requestId !== locationRequestIdRef.current)
        return;
      if (!position) {
        setLocationFeedback(
          "No pude obtener tu ubicación. Revisa los permisos y activa la ubicación del teléfono.",
        );
        return;
      }
      void sendTurn(question.text, answerId, position);
    } catch {
      if (mountedRef.current && requestId === locationRequestIdRef.current) {
        setLocationFeedback(
          "No pude obtener tu ubicación. Vuelve a intentarlo.",
        );
      }
    } finally {
      if (mountedRef.current && requestId === locationRequestIdRef.current) {
        locationRequestRef.current = false;
        setRequestingLocation(false);
      }
    }
  };

  const retry = () => {
    if (sendingRef.current || locationRequestRef.current) return;
    const turn = getRetryableAgentTurn(messagesRef.current);
    if (turn) void sendTurn(turn.question, turn.answerId);
  };

  return {
    /** True until the first words of the answer arrive. */
    awaitingText: sending && awaitingText,
    cancel,
    draft,
    limitReached: hasAgentMessageLimit(messages),
    locationFeedback,
    messages,
    newConversation,
    retry,
    requestLocationForMessage,
    requestingLocation,
    send: (text: string) => sendTurn(text),
    sending,
    setDraft,
    userMessageCount: countAgentUserMessages(messages),
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
    role: "assistant",
    sources: answer.sources,
    text: answer.text,
  };
}
