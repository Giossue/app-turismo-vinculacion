import type { PublicSearchQueryDto } from "./search.dto";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// These are query aliases, not replacements for the administrable taxonomy.
const queryAliases = [
  ["cafe", "cafes", "cafeteria", "cafeterias"],
  ["comer", "comida", "restaurante", "restaurantes", "alimentos y bebidas"],
  [
    "hotel",
    "hoteles",
    "hostal",
    "hostales",
    "hosteria",
    "hospedaje",
    "alojamiento",
  ],
  ["cascada", "cascadas"],
  ["museo", "museos"],
] as const;

export function searchTerms(query: string): readonly string[] {
  const text = normalizeSearchText(query);
  const aliases = queryAliases.find((group) =>
    group.some((alias) => alias === text),
  );
  return [...new Set([text, ...(aliases ?? [])])];
}

export function textualRelevance(
  query: string,
  title: string,
  details: string,
  terms: readonly string[],
): number {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedDetails = normalizeSearchText(details);
  if (normalizedTitle === query) return 600;
  if (normalizedTitle.startsWith(query)) return 500;
  if (normalizedTitle.includes(query)) return 400;
  if (terms.some((term) => normalizedTitle.includes(term))) return 300;
  if (terms.some((term) => normalizedDetails.includes(term))) return 200;
  // Photon supplies its own typo-tolerant candidates; provider order is a stable
  // tie breaker after the same relevance tiers used for the internal catalog.
  return 100;
}

export function distanceFromOrigin(
  latitude: number,
  longitude: number,
  query: Pick<PublicSearchQueryDto, "latitude" | "longitude">,
): number | null {
  if (query.latitude === undefined || query.longitude === undefined)
    return null;
  const radians = Math.PI / 180;
  const latitudeDelta = (latitude - query.latitude) * radians;
  const longitudeDelta = (longitude - query.longitude) * radians;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(query.latitude * radians) *
      Math.cos(latitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    6_371_008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.min(1, a))),
  );
}

export function withinBounds(
  latitude: number,
  longitude: number,
  query: Pick<PublicSearchQueryDto, "west" | "south" | "east" | "north">,
): boolean {
  return (
    query.west === undefined ||
    (longitude >= query.west &&
      longitude <= query.east! &&
      latitude >= query.south! &&
      latitude <= query.north!)
  );
}
