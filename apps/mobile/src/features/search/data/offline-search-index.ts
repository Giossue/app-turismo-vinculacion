import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import {
  getOfflineBrowserItems,
  type OfflineBrowserItem,
} from "@/features/offline/presentation/offline-city-browser";
import {
  isCloseSearchWord,
  prepareSearchDocument,
  type PreparedSearchDocument,
  type PreparedSearchQuery,
} from "../domain/search-relevance";

type IndexedPlace = Readonly<{
  item: OfflineBrowserItem;
  document: PreparedSearchDocument;
}>;
type SearchIndex = Readonly<{
  places: readonly IndexedPlace[];
  words: ReadonlyMap<string, readonly number[]>;
}>;

// Una descarga nueva tiene otro objeto; el índice no retiene la anterior.
const indexes = new WeakMap<OfflineCityManifest, SearchIndex>();

function getIndex(manifest: OfflineCityManifest): SearchIndex {
  const cached = indexes.get(manifest);
  if (cached) return cached;
  const places: IndexedPlace[] = [];
  const words = new Map<string, number[]>();
  for (const item of getOfflineBrowserItems(manifest))
    addPlace(places, words, item);
  const index = { places, words };
  indexes.set(manifest, index);
  return index;
}

function addPlace(
  places: IndexedPlace[],
  words: Map<string, number[]>,
  item: OfflineBrowserItem,
): void {
  const document = prepareSearchDocument(
    item.name,
    item.subtitle,
    item.kind === "place"
      ? `${item.description ?? ""} ${item.address ?? ""}`
      : "",
  );
  const position = places.length;
  places.push({ item, document });
  for (const word of new Set([
    ...document.titleWords,
    ...document.detailWords,
  ])) {
    if (!word) continue;
    const matches = words.get(word);
    if (matches) matches.push(position);
    else words.set(word, [position]);
  }
}

/** La lectura bajo demanda prepara bloques pequeños antes de publicar el paquete. */
export async function prepareOfflineSearchIndex(
  manifest: OfflineCityManifest,
  signal: AbortSignal,
): Promise<void> {
  if (indexes.has(manifest)) return;
  const places: IndexedPlace[] = [];
  const words = new Map<string, number[]>();
  const items = getOfflineBrowserItems(manifest);
  for (let start = 0; start < items.length; start += 250) {
    if (signal.aborted) {
      const error = new Error("La búsqueda fue cancelada.");
      error.name = "AbortError";
      throw error;
    }
    const end = Math.min(start + 250, items.length);
    for (let position = start; position < end; position += 1)
      addPlace(places, words, items[position]!);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (signal.aborted) {
    const error = new Error("La búsqueda fue cancelada.");
    error.name = "AbortError";
    throw error;
  }
  indexes.set(manifest, { places, words });
}

/** Candidatos conservadores: la fórmula vigente decide las coincidencias finales. */
export function getOfflineSearchCandidates(
  manifest: OfflineCityManifest,
  query: PreparedSearchQuery,
): readonly IndexedPlace[] {
  const first = query.terms[0];
  if (!first || query.normalized.length < 2) return [];
  const index = getIndex(manifest);
  const terms = [
    ...new Set([
      ...query.aliases.map((alias) => alias.split(" ")[0]!),
      ...first.aliases.map((alias) => alias.split(" ")[0]!),
    ]),
  ];
  const candidates = new Set<number>();
  for (const [word, matches] of index.words) {
    if (
      terms.some((term) => word.includes(term)) ||
      isCloseSearchWord(first.text, word)
    ) {
      for (const match of matches) candidates.add(match);
    }
  }
  // Conserva el orden original en empates y en deduplicación entre paquetes.
  return index.places.filter((_, position) => candidates.has(position));
}
