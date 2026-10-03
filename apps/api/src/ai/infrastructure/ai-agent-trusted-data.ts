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
  fallbackRef?: string,
): {
  text: string;
  cards: AgentCard[];
  actions: AgentAction[];
  sources: AgentSource[];
} {
  const cards: AgentCard[] = [];
  const sources: AgentSource[] = [];
  const seenCardRefs = new Set<string>();
  const seenSources = new Set<string>();

  const addSource = (source: AgentSource) => {
    const sourceKey = `${source.type}:${source.label}`;
    if (seenSources.has(sourceKey) || sources.length >= 24) return;
    seenSources.add(sourceKey);
    sources.push(source);
  };

  const addCard = (ref: string) => {
    if (seenCardRefs.has(ref) || cards.length >= 6) return;
    const entity = entities.get(ref);
    if (!entity) return;
    seenCardRefs.add(ref);
    cards.push(entity.card);
    addSource(entity.source);
  };

  for (const requestedCard of output.cards) {
    addCard(requestedCard.ref);
  }

  for (const requestedAction of output.actions) {
    const entity = entities.get(requestedAction.ref);
    if (!entity) continue;
    if (requestedAction.type === "open_center") {
      if (entity.card.type !== "center") continue;
    } else if (requestedAction.type === "start_route") {
      if (!entity.destination) continue;
    } else {
      continue;
    }
    addCard(requestedAction.ref);
  }

  // A focused answer (e.g. an admission price) can omit model references.
  // Use a detailed lookup or a sole result; never choose among other candidates.
  if (
    cards.length === 0 &&
    output.cards.length === 0 &&
    output.actions.length === 0
  ) {
    if (fallbackRef) addCard(fallbackRef);
    if (cards.length === 0 && entities.size === 1) {
      const onlyEntity = entities.values().next().value;
      if (onlyEntity) addCard(onlyEntity.ref);
    }
  }

  trustedSources.forEach(addSource);

  return {
    actions: [],
    cards,
    sources,
    text: output.text,
  };
}
