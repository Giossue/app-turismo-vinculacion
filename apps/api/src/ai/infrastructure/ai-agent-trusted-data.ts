import type {
  AgentAction,
  AgentCard,
  AgentItinerary,
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
  itinerary?: AgentItinerary;
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

  const itinerary = sanitizeAgentItinerary(
    output.itinerary,
    entities,
    addSource,
  );

  return {
    actions,
    cards,
    ...(itinerary ? { itinerary } : {}),
    sources,
    text: output.text,
  };
}

function sanitizeAgentItinerary(
  itinerary: AgentModelResponse["itinerary"],
  entities: ReadonlyMap<string, TrustedAgentEntity>,
  addSource: (source: AgentSource) => void,
): AgentItinerary | undefined {
  if (!itinerary) return undefined;

  const seenRefs = new Set<string>();
  const stops = itinerary.stops
    .slice()
    .sort((left, right) => left.order - right.order)
    .filter((stop) => {
      if (seenRefs.has(stop.ref)) return false;
      const entity = entities.get(stop.ref);
      if (!entity || entity.card.type !== "center" || !entity.destination)
        return false;
      seenRefs.add(stop.ref);
      addSource(entity.source);
      return true;
    })
    .slice(0, 6)
    .map((stop, index) => {
      const entity = entities.get(stop.ref)!;
      const destination = entity.destination!;
      return {
        type: "center" as const,
        code: (entity.card as Extract<AgentCard, { type: "center" }>).code,
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
        order: index + 1,
      };
    });

  if (stops.length < 2) return undefined;

  return {
    title: truncate(itinerary.title, 160),
    summary: truncate(itinerary.summary, 500),
    stops,
  };
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trim()}…`;
}
