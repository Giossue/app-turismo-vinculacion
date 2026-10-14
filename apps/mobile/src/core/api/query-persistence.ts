import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, type QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

import {
  canPersistQuery,
  createQueryCachePersister,
  filterPersistedClient,
} from "./query-cache-persister";
import {
  getQueryAccountId,
  isUserScopedQueryKey,
  ONE_DAY_MS,
} from "./query-keys";
import { preserveConfirmedQueries } from "./optimistic-query-persistence";

// Al iniciar se desconoce la cuenta; AuthProvider valida el propietario tras hidratar.
let persistedAccountId: number | null | undefined;
let accountChange = 0;

const queryCachePersister = createQueryCachePersister({
  key: "rumbo-ec-query-cache-v1",
  storage: AsyncStorage,
  filter: (client) => filterPersistedClient(client, persistedAccountId),
});

/** Options for `PersistQueryClientProvider`: see `persistedQueryKeys`. */
export const queryPersistOptions = {
  buster: "mobile-v3",
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" &&
      canPersistQuery(
        query.queryKey,
        query.state.dataUpdatedAt,
        persistedAccountId,
      ),
  },
  maxAge: ONE_DAY_MS,
  persister: queryCachePersister,
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

/** La copia de disco conserva favoritos confirmados durante los cambios visuales. */
export function getQueryPersistOptions(queryClient: QueryClient) {
  return {
    ...queryPersistOptions,
    persister: {
      ...queryCachePersister,
      persistClient: (
        client: Parameters<typeof queryCachePersister.persistClient>[0],
      ) =>
        queryCachePersister.persistClient(
          preserveConfirmedQueries(queryClient, client),
        ),
    },
  };
}

/** Retira otras cuentas de inmediato y reescribe solo los datos admitidos. */
export function retainQueryAccount(
  queryClient: QueryClient,
  accountId: number | null,
): Promise<void> {
  persistedAccountId = accountId;
  const change = ++accountChange;
  queryClient.removeQueries({
    predicate: (query) =>
      isUserScopedQueryKey(query.queryKey) &&
      (accountId === null || getQueryAccountId(query.queryKey) !== accountId),
  });
  const mutations = queryClient.getMutationCache();
  for (const mutation of mutations.getAll()) {
    if (
      isUserScopedQueryKey(mutation.options.mutationKey ?? []) &&
      (accountId === null || mutation.options.meta?.accountId !== accountId)
    ) {
      mutations.remove(mutation);
    }
  }
  return Promise.resolve(queryCachePersister.removeClient()).then(async () => {
    if (change !== accountChange) return;
    const write = getQueryPersistOptions(queryClient).persister.persistClient({
      buster: queryPersistOptions.buster,
      timestamp: Date.now(),
      clientState: dehydrate(queryClient, queryPersistOptions.dehydrateOptions),
    });
    await queryCachePersister.flush();
    await write;
  });
}
