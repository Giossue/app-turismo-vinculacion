import type { AgentMessage } from "./agent";

export type AgentDemoMessage = AgentMessage;

export const agentDemoMessages: readonly AgentDemoMessage[] = [
  {
    id: "user-1",
    role: "user",
    text: "Quiero un lugar con una buena vista cerca de Guaranda.",
  },
  {
    id: "assistant-1",
    role: "assistant",
    text: "Encontré un atractivo publicado que puede encajar con tu plan:",
    cards: [
      {
        type: "center",
        category: "Naturaleza",
        code: "GUA-NAT-001",
        latitude: -1.59,
        longitude: -79,
        distanceMeters: null,
        name: "Mirador El Calvario",
        summary: "Vista panorámica de Guaranda y su entorno andino.",
      },
    ],
    sources: [
      { type: "center", label: "Ficha pública del atractivo" },
      { type: "center", label: "Catálogo territorial aprobado" },
    ],
  },
];
