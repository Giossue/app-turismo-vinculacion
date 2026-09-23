import type { QueryKey } from "@tanstack/react-query";

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prefixes of every TanStack Query key in the app. Features append their
 * parameters (`[...queryKeys.publishedCenter, code]`) and invalidate by prefix.
 * Changing a version segment discards entries persisted under the old shape.
 */
export const queryKeys = {
  calculatedRoute: ["calculated-route"],
  // Paginated (infinite) list; the segment discards the single-page shape.
  centerOpinions: ["center-opinions", "pages-v1"],
  discoveryCatalog: ["discovery-catalog"],
  nearbyEstablishments: ["nearby-establishments"],
  offlineCities: ["offline-cities"],
  offlineStoredCities: ["offline-stored-cities"],
  ownOpinion: ["own-center-opinion"],
  publicSearch: ["public-search"],
  publishedCenter: ["public-center"],
  // Los centros en línea nunca se mezclan con los manifiestos offline.
  publishedCenters: ["public-centers", "remote-authoritative-v1"],
  savedCenters: ["saved-centers", "account-v2"],
} as const satisfies Record<string, QueryKey>;

/** Data that belongs to the signed-in tourist; removed from the cache at logout. */
export const userScopedQueryKeys: readonly QueryKey[] = [
  queryKeys.ownOpinion,
  queryKeys.savedCenters,
];

/**
 * Data that may be persisted to AsyncStorage: the public catalog and the
 * tourist's saved places, so Guardados opens without a connection. Logout
 * removes `userScopedQueryKeys` from memory and clears the persisted
 * snapshot. Anything else (the own opinion, searches, viewport- or GPS-keyed
 * results) stays in memory.
 */
const persistedQueryKeys: readonly QueryKey[] = [
  queryKeys.centerOpinions,
  queryKeys.discoveryCatalog,
  queryKeys.offlineCities,
  queryKeys.publishedCenter,
  queryKeys.publishedCenters,
  queryKeys.savedCenters,
];

const persistedRoots = new Set(persistedQueryKeys.map((key) => key[0]));

export function isPersistedQueryKey(queryKey: QueryKey): boolean {
  return persistedRoots.has(queryKey[0]);
}
