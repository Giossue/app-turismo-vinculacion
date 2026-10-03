import type {
  AgentAction,
  AgentCard,
  AgentModelResponse,
  AgentResponse,
  AgentSource,
} from "../application/ai-agent.contracts";
import type { PublicCenterRepository } from "../../centers/application/public-center.repository";
import type {
  PublicCenter,
  PublicCenterDetail,
} from "../../centers/domain/public-center";

/** Completes only selected cards with published addresses and catalog locality names. */
export async function enrichAgentCenterLocations(
  answer: AgentResponse,
  centers: Pick<
    PublicCenterRepository,
    "findPublishedByCode" | "getDiscoveryCatalog"
  >,
  registeredCenters: ReadonlyMap<string, PublicCenter | PublicCenterDetail>,
  abortSignal?: AbortSignal,
): Promise<AgentResponse> {
  if (
    abortSignal?.aborted ||
    !answer.cards.some((card) => card.type === "center")
  )
    return answer;

  const catalog = Promise.resolve()
    .then(() => centers.getDiscoveryCatalog())
    .catch(() => null);
  const details = new Map<string, Promise<PublicCenterDetail | null>>();
  const cards = await Promise.all(
    answer.cards.map(async (card) => {
      if (card.type !== "center") return card;
      const registered = registeredCenters.get(card.code);
      let detail: PublicCenterDetail | null;
      if (registered && "address" in registered) {
        detail = registered;
      } else {
        let pending = details.get(card.code);
        if (!pending) {
          pending = Promise.resolve()
            .then(() => centers.findPublishedByCode(card.code))
            .then((result) => (result?.code === card.code ? result : null))
            .catch(() => null);
          details.set(card.code, pending);
        }
        detail = await pending;
      }
      const center = detail ?? registered;
      const locality = (await catalog)?.cantons.find(
        (canton) => canton.code === center?.cantonCode,
      );
      return {
        ...card,
        address: detail?.address?.trim().slice(0, 500) || null,
        localityName: locality?.name.trim().slice(0, 180) || null,
      };
    }),
  );
  return { ...answer, cards };
}

export type TrustedAgentEntity = Readonly<{
  ref: string;
  card: AgentCard;
  destination: Readonly<{
    type: "center" | "establishment" | "poi";
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
  trustedSources: readonly AgentSource[] = [],
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
    if (seenSources.has(sourceKey) || sources.length >= 24) return;
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

  trustedSources.forEach(addSource);

  return {
    actions,
    cards,
    sources,
    text: output.text,
  };
}
