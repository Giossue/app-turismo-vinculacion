import type {
  AgentAction,
  AgentCard,
  AgentModelResponse,
  AgentSource,
} from "../application/ai-agent.contracts";

export type TrustedAgentEntity = Readonly<{
  ref: string;
  card: AgentCard;
  destination: Readonly<{
    type: "center" | "establishment";
    code?: string;
    name: string;
    latitude: number;
    longitude: number;
  }> | null;
  source: AgentSource;
}>;

export function sanitizeAgentResponse(
  output: AgentModelResponse,
  entities: ReadonlyMap<string, TrustedAgentEntity>,
): {
  text: string;
  cards: AgentCard[];
  actions: AgentAction[];
  sources: AgentSource[];
} {
  const cards: AgentCard[] = [];
  const actions: AgentAction[] = [];
  const sources: AgentSource[] = [];
  const seenCardRefs = new Set<string>();
  const seenSources = new Set<string>();

  const addSource = (source: AgentSource) => {
    const sourceKey = `${source.type}:${source.label}`;
    if (seenSources.has(sourceKey)) return;
    seenSources.add(sourceKey);
    sources.push(source);
  };

  for (const requestedCard of output.cards) {
    if (seenCardRefs.has(requestedCard.ref)) continue;
    const entity = entities.get(requestedCard.ref);
    if (!entity) continue;
    seenCardRefs.add(requestedCard.ref);
    cards.push(entity.card);
    addSource(entity.source);
  }

  for (const requestedAction of output.actions) {
    const entity = entities.get(requestedAction.ref);
    if (!entity) continue;
    addSource(entity.source);

    if (requestedAction.type === "open_center") {
      if (entity.card.type !== "center") continue;
      actions.push({ type: "open_center", code: entity.card.code });
      continue;
    }

    if (!entity.destination) continue;
    actions.push({
      type: "start_route",
      destination: entity.destination,
      mode: requestedAction.mode,
      requiresConfirmation: true,
    });
  }

  return { actions, cards, sources, text: output.text };
}
