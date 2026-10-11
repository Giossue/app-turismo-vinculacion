import type { SearchSuggestionItem } from "./search-suggestion";

const synonymGroups = [
  ["cafe", "cafes", "cafeteria", "cafeterias"],
  [
    "hotel",
    "hoteles",
    "hostal",
    "hostales",
    "hosteria",
    "hospedaje",
    "alojamiento",
  ],
  ["restaurante", "restaurantes", "comida", "comer", "alimentos y bebidas"],
  ["cascada", "cascadas"],
  ["museo", "museos"],
  ["parque", "parques"],
  ["mirador", "miradores"],
] as const;

export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function alternatives(term: string): readonly string[] {
  return (
    synonymGroups.find((group) => group.some((word) => word === term)) ?? [term]
  );
}

/** One insertion, deletion, replacement or transposition for words >= 5 chars. */
export function isCloseSearchWord(term: string, word: string): boolean {
  if (term.length < 5 || Math.abs(term.length - word.length) > 1) return false;
  if (term === word) return true;
  if (term.length === word.length) {
    const different: number[] = [];
    for (let index = 0; index < term.length; index += 1) {
      if (term[index] !== word[index]) different.push(index);
      if (different.length > 2) return false;
    }
    if (different.length === 1) return true;
    const [first, second] = different;
    return (
      first !== undefined &&
      second === first + 1 &&
      term[first] === word[second] &&
      term[second] === word[first]
    );
  }
  const shorter = term.length < word.length ? term : word;
  const longer = term.length < word.length ? word : term;
  let offset = 0;
  for (let index = 0; index < shorter.length; index += 1) {
    if (shorter[index] === longer[index + offset]) continue;
    if (offset !== 0) return false;
    offset = 1;
    if (shorter[index] !== longer[index + offset]) return false;
  }
  return true;
}

/** Text relevance of a place; see `searchScore` for the final order. */
export function getSearchRelevance(
  query: string,
  title: string,
  subtitle: string,
  extra = "",
): number {
  return getPreparedSearchRelevance(
    prepareSearchQuery(query),
    prepareSearchDocument(title, subtitle, extra),
  );
}

export type PreparedSearchQuery = Readonly<{
  normalized: string;
  aliases: readonly string[];
  terms: readonly Readonly<{ text: string; aliases: readonly string[] }>[];
}>;

export type PreparedSearchDocument = Readonly<{
  name: string;
  details: string;
  titleWords: readonly string[];
  detailWords: readonly string[];
}>;

/** Normaliza la consulta una sola vez, incluidos sus sinónimos. */
export function prepareSearchQuery(query: string): PreparedSearchQuery {
  const normalized = normalizeSearchText(query);
  return {
    normalized,
    aliases: alternatives(normalized),
    terms: normalized
      .split(" ")
      .filter(Boolean)
      .map((text) => ({
        text,
        aliases: alternatives(text),
      })),
  };
}

/** Los textos de una descarga no se vuelven a normalizar por cada pulsación. */
export function prepareSearchDocument(
  title: string,
  subtitle: string,
  extra = "",
): PreparedSearchDocument {
  const name = normalizeSearchText(title);
  const details = normalizeSearchText(`${subtitle} ${extra}`);
  return {
    name,
    details,
    titleWords: name.split(" "),
    detailWords: details.split(" "),
  };
}

export function getPreparedSearchRelevance(
  query: PreparedSearchQuery,
  document: PreparedSearchDocument,
): number {
  const { normalized } = query;
  if (normalized.length < 2) return 0;
  const { name, details, titleWords, detailWords } = document;
  if (name === normalized) return 600;
  if (name.startsWith(normalized)) return 500;
  if (name.includes(normalized)) return 400;
  const queryAliases = query.aliases;
  if (queryAliases.some((term) => name.includes(term))) return 300;
  if (queryAliases.some((term) => details.includes(term))) return 200;
  let allTermsInTitle = true;
  let needsFuzzyMatch = false;
  let fuzzyTitleMatch = false;
  for (const { text: term, aliases: terms } of query.terms) {
    const titleMatch = terms.some((candidate) =>
      titleWords.some((word) => word.startsWith(candidate)),
    );
    const detailsMatch = terms.some((candidate) =>
      detailWords.some((word) => word.startsWith(candidate)),
    );
    // La coincidencia aproximada solo hace falta si falló la normal.
    const closeTitle =
      !titleMatch &&
      !detailsMatch &&
      titleWords.some((word) => isCloseSearchWord(term, word));
    const closeDetails =
      !titleMatch &&
      !detailsMatch &&
      !closeTitle &&
      detailWords.some((word) => isCloseSearchWord(term, word));
    if (!titleMatch && !detailsMatch && !closeTitle && !closeDetails) return 0;
    if (!titleMatch) allTermsInTitle = false;
    if (!titleMatch && !detailsMatch) {
      needsFuzzyMatch = true;
      if (closeTitle) fuzzyTitleMatch = true;
    }
  }
  if (needsFuzzyMatch) return fuzzyTitleMatch ? 125 : 100;
  return allTermsInTitle ? 300 : 200;
}

/** Same formula as the API: up to 150 points for nearby places, half at 5 km. */
function searchScore(
  relevance: number,
  distanceMeters: number | null | undefined,
): number {
  const proximity =
    distanceMeters === null || distanceMeters === undefined
      ? 0
      : 150 / (1 + distanceMeters / 5_000);
  // An exact name still wins over any nearby partial match.
  return (relevance >= 600 ? 800 : relevance) + proximity;
}

export function rankSearchSuggestions(
  items: readonly SearchSuggestionItem[],
  query: string,
): readonly SearchSuggestionItem[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: searchScore(
        item.relevance ?? getSearchRelevance(query, item.title, item.subtitle),
        item.distanceMeters,
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.item.distanceMeters ?? Infinity) -
          (b.item.distanceMeters ?? Infinity) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}

/** Both sources use the same public identity; keep the first usable copy. */
export function deduplicateSearchSuggestions(
  items: readonly SearchSuggestionItem[],
): readonly SearchSuggestionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}
