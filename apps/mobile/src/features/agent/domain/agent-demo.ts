export type AgentDemoCard = Readonly<{
  category: string;
  code: string;
  name: string;
  summary: string;
}>;

export type AgentDemoMessage = Readonly<{
  id: string;
  role: "assistant" | "user";
  text: string;
  cards?: readonly AgentDemoCard[];
  sources?: readonly string[];
}>;

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
        category: "Naturaleza",
        code: "GUA-NAT-001",
        name: "Mirador El Calvario",
        summary: "Vista panorámica de Guaranda y su entorno andino.",
      },
    ],
    sources: ["Ficha pública del atractivo", "Catálogo territorial aprobado"],
  },
];
