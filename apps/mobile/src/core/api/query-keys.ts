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
  // Derivada del GPS: solo en memoria, nunca en `persistedQueryKeys`.
  nearbyPlaces: ["nearby-places"],
  offlineCities: ["offline-cities"],
  offlineStoredCities: ["offline-stored-cities"],
  ownOpinion: ["own-center-opinion"],
  publicSearch: ["public-search"],
  publishedCenter: ["public-center"],
  publishedEstablishment: ["public-establishment"],
  // Los centros en línea nunca se mezclan con los manifiestos offline.
  publishedCenters: ["public-centers", "remote-authoritative-v1"],
  // Visible map areas stay in memory; their boxes must never be persisted.
  publishedMapCenters: ["public-map-centers"],
  savedCenters: ["saved-centers", "account-v2"],
  savedEstablishments: ["saved-establishments", "account-v1"],
} as const satisfies Record<string, QueryKey>;

/** Data that belongs to the signed-in tourist; removed from the cache at logout. */
export const userScopedQueryKeys: readonly QueryKey[] = [
  queryKeys.ownOpinion,
  queryKeys.savedCenters,
  queryKeys.savedEstablishments,
];

/**
 * Catálogo público y favoritos admitidos en AsyncStorage para uso sin conexión.
 * Salir retira las claves privadas y reescribe una copia pública. La opinión
 * propia, búsquedas, viewport y resultados derivados de GPS quedan en memoria.
 */
const persistedQueryKeys: readonly QueryKey[] = [
  queryKeys.centerOpinions,
  queryKeys.discoveryCatalog,
  queryKeys.offlineCities,
  queryKeys.publishedCenter,
  queryKeys.publishedCenters,
  queryKeys.publishedEstablishment,
  queryKeys.savedCenters,
  queryKeys.savedEstablishments,
];

export function isPersistedQueryKey(queryKey: QueryKey): boolean {
  return persistedQueryKeys.some((prefix) =>
    prefix.every((segment, index) => queryKey[index] === segment),
  );
}

export function isUserScopedQueryKey(queryKey: QueryKey): boolean {
  return userScopedQueryKeys.some((prefix) => queryKey[0] === prefix[0]);
}

/** Las claves privadas terminan con el ID numérico de su propietario. */
export function getQueryAccountId(queryKey: QueryKey): number | null {
  const owner = queryKey.at(-1);
  return isUserScopedQueryKey(queryKey) &&
    typeof owner === "number" &&
    Number.isInteger(owner) &&
    owner > 0
    ? owner
    : null;
}
