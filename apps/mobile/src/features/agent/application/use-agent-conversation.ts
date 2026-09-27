import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/core/api/http";
import type { GeoCoordinate } from "@/core/geo/types";
import { getLocationAvailability } from "@/core/location/location-availability";
import { useUserLocation } from "@/core/location/use-user-location";
import { useAuth } from "@/features/auth/application/auth-context";
import { askTourismAgentStream } from "../data/agent-api";
import type { SavedAgentConversationDetail } from "../data/agent-history-api";
import { analyzeAgentPhoto } from "../data/agent-media-api";
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
  shouldShareAgentLocation,
} from "../domain/agent-conversation";

/**
 * One chat with the tourism agent: the bubbles, the streaming answer and
 * the route proposal awaiting confirmation. Closing the chat (unmounting)
 * aborts the answer in progress.
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
  const [pendingRouteAction, setPendingRouteAction] =
    useState<StartRouteAction | null>(null);
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
    setPendingRouteAction(null);
    setDraft("");
  }, []);

  const loadSavedConversation = useCallback(
    (saved: SavedAgentConversationDetail) => {
      locationRequestIdRef.current += 1;
      locationRequestRef.current = false;
      setRequestingLocation(false);
      setLocationFeedback(null);
      abortRef.current?.abort();
      abortRef.current = null;
      answerIdRef.current = null;
      sendingRef.current = false;
      conversationIdRef.current = saved.id;
      messagesRef.current = [
        agentIntroMessage,
        ...saved.messages.map((message, index): AgentMessage => ({
          id: `history-${saved.id}-${index}`,
          role: message.role,
          text: message.text,
          sources: message.sources,
        })),
      ];
      setMessages(messagesRef.current);
      setSending(false);
      setAwaitingText(false);
      setPendingRouteAction(null);
      setDraft("");
    },
    [],
  );

  const forgetSavedConversation = useCallback((id: string) => {
    if (conversationIdRef.current === id) conversationIdRef.current = null;
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
    locationOverride?: GeoCoordinate,
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
    setLocationFeedback(null);
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
            text: "Para buscar lugares cerca de ti, necesito una ubicación actual. Toca «Usar mi ubicación» para obtenerla y repetir la consulta.",
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
          "No pude obtener una ubicación precisa. Revisa el permiso y la señal GPS, y vuelve a intentarlo.",
        );
        return;
      }
      const baseMessages =
        answerIndex === messagesRef.current.length - 1
          ? messagesRef.current.slice(0, answerIndex - 1)
          : messagesRef.current;
      void send(question.text, baseMessages, position);
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
    if (sendingRef.current) return;
    const turn = getRetryableAgentTurn(messagesRef.current);
    if (turn) void send(turn.question, turn.previous);
  };

  const sendPhoto = async (upload: {
    uri: string;
    mimeType: string;
    name: string;
  }) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const question: AgentMessage = {
      id: createId("user"),
      role: "user",
      text: "Foto enviada para consultar un lugar",
    };
    const answerId = createId("assistant");
    answerIdRef.current = answerId;
    setSending(true);
    setAwaitingText(true);
    setPendingRouteAction(null);
    updateMessages((current) => [...current, question]);
    try {
      const result = await analyzeAgentPhoto(
        upload,
        auth.request,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        updateMessages((current) =>
          upsertMessage(current, toCompleteMessage(answerId, result)),
        );
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        updateMessages((current) =>
          upsertMessage(current, {
            id: answerId,
            role: "assistant",
            kind: "error",
            text:
              failure instanceof ApiError
                ? failure.message
                : agentFallbackErrorMessage,
          }),
        );
      }
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

  return {
    /** True until the first words of the answer arrive. */
    awaitingText: sending && awaitingText,
    cancel,
    draft,
    forgetSavedConversation,
    loadSavedConversation,
    locationFeedback,
    messages,
    newConversation,
    pendingRouteAction,
    retry,
    requestLocationForMessage,
    requestingLocation,
    sendPhoto,
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
    text: answer.historySaveError
      ? `${answer.text}\n\nNo se pudo guardar esta respuesta en el historial.`
      : answer.text,
  };
}
