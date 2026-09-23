import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

import { isPersistedQueryKey, ONE_DAY_MS } from "./query-keys";

const queryCachePersister = createAsyncStoragePersister({
  key: "turismo-vinculacion-query-cache-v1",
  storage: AsyncStorage,
  throttleTime: 1000,
});

/** Options for `PersistQueryClientProvider`: see `persistedQueryKeys`. */
export const queryPersistOptions = {
  // v3 descarta cachés anteriores que aún contenían búsquedas y consultas por
  // viewport.
  buster: "mobile-v3",
  dehydrateOptions: {
    // Solo las claves permitidas: nada de búsquedas ni consultas por
    // ubicación o viewport sobrevive en AsyncStorage.
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" && isPersistedQueryKey(query.queryKey),
  },
  maxAge: ONE_DAY_MS,
  persister: queryCachePersister,
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

/**
 * Deletes the persisted snapshot right away. Used at logout after removing
 * the account's queries from memory, so a pending throttled write cannot
 * leave them on disk; the next cache change writes a fresh snapshot.
 */
export async function clearPersistedQueryCache(): Promise<void> {
  try {
    await queryCachePersister.removeClient();
  } catch {
    // La caché persistida se reescribe con el siguiente cambio de la caché.
  }
}
