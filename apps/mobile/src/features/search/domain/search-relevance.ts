import type { SearchSuggestionItem } from "./search-suggestion";

const synonymGroups = [
  ["cafe", "cafes", "cafeteria", "cafeterias"],
  ["hotel", "hoteles", "hostal", "hostales", "hospedaje", "alojamiento"],
  ["restaurante", "restaurantes", "comida", "comer"],
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
function isCloseWord(term: string, word: string): boolean {
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

/** Text relevance comes first; distance only breaks equally relevant matches. */
export function getSearchRelevance(
  query: string,
  title: string,
  subtitle: string,
  extra = "",
): number {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return 0;
  const name = normalizeSearchText(title);
  const details = normalizeSearchText(`${subtitle} ${extra}`);
  if (name === normalized) return 500;
  if (name.startsWith(normalized)) return 400;
  if (name.includes(normalized)) return 300;
  const titleWords = name.split(" ");
  const detailWords = details.split(" ");
  let score = 0;
  for (const term of normalized.split(" ")) {
    const terms = alternatives(term);
    const titleMatch = terms.some((candidate) =>
      titleWords.some((word) => word.startsWith(candidate)),
    );
    const detailsMatch = terms.some((candidate) =>
      detailWords.some((word) => word.startsWith(candidate)),
    );
    const closeTitle = titleWords.some((word) => isCloseWord(term, word));
    const closeDetails = detailWords.some((word) => isCloseWord(term, word));
    if (!titleMatch && !detailsMatch && !closeTitle && !closeDetails) return 0;
    score += titleMatch ? 200 : detailsMatch ? 100 : closeTitle ? 70 : 40;
  }
  return score / normalized.split(" ").length;
}

export function rankSearchSuggestions(
  items: readonly SearchSuggestionItem[],
  query: string,
): readonly SearchSuggestionItem[] {
  return items
    .map((item, index) => ({
      item,
      index,
      relevance: getSearchRelevance(query, item.title, item.subtitle),
    }))
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
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
