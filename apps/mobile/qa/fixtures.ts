import { useState } from "react";

import type { useAgentConversation } from "../src/features/agent/application/use-agent-conversation";
import type {
  AgentMessage,
  StartRouteAction,
} from "../src/features/agent/domain/agent";
import type { CalculatedRoute } from "../src/features/routing/domain/routing";

export const travelTimeAnswer: AgentMessage = {
  id: "qa-answer",
  role: "assistant",
  text: "Estas son las opciones para llegar. Los tiempos son estimados y permiten comparar carro, caminata y bicicleta.",
  cards: [
    {
      type: "establishment",
      name: "Restaurante de prueba con un nombre largo",
      summary:
        "Un lugar de ejemplo para verificar textos amplios y tiempos de viaje en pantallas pequeñas.",
      category: "Restaurante",
      address: "Avenida de ejemplo y calle de prueba",
      phone: null,
      localityName: "Localidad de prueba",
      latitude: 0,
      longitude: 0,
      distanceMeters: 650,
      travelTimes: [
        {
          mode: "car",
          status: "available",
          durationSeconds: 420,
          distanceMeters: 1200,
        },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "unavailable" },
      ],
    },
  ],
};

/** State and callbacks satisfy the real UI contract without mounting its hook. */
export function useConversationFixture(): ReturnType<
  typeof useAgentConversation
> {
  const [draft, setDraft] = useState("Consulta de prueba\ncon varias líneas");
  const [messages, setMessages] = useState<readonly AgentMessage[]>([
    { id: "qa-question", role: "user", text: "¿Cuánto tardaría en llegar?" },
    travelTimeAnswer,
  ]);
  const [pendingRouteAction, setPendingRouteAction] =
    useState<StartRouteAction | null>(null);

  return {
    awaitingText: false,
    cancel: () => undefined,
    draft,
    limitReached: false,
    locationFeedback: null,
    messages,
    newConversation: () => {
      setDraft("");
      setMessages([travelTimeAnswer]);
      setPendingRouteAction(null);
    },
    pendingRouteAction,
    retry: async () => undefined,
    requestingLocation: false,
    requestLocationForMessage: async () => undefined,
    send: async (text) => {
      setMessages((current) => [
        ...current,
        { id: `qa-user-${current.length}`, role: "user", text },
        { ...travelTimeAnswer, id: `qa-answer-${current.length}` },
      ]);
    },
    sending: false,
    setDraft,
    setPendingRouteAction,
    userMessageCount: messages.filter((message) => message.role === "user")
      .length,
  };
}

export const calculatedRouteFixture: CalculatedRoute = {
  mode: "car",
  distanceMeters: 1200,
  durationSeconds: 420,
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [0.001, 0.001],
    ],
  },
  steps: [
    {
      instruction:
        "Continúa por la avenida de ejemplo hasta encontrar el cruce principal de la localidad",
      name: "Avenida de ejemplo",
      distanceMeters: 700,
      durationSeconds: 240,
      maneuver: { type: "depart", modifier: "straight", exit: null },
    },
    {
      instruction: "Gira a la derecha hacia el destino de prueba",
      name: "Calle de prueba",
      distanceMeters: 500,
      durationSeconds: 180,
      maneuver: { type: "turn", modifier: "right", exit: null },
    },
  ],
};
