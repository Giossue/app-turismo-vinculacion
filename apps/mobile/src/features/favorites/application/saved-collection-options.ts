import {
  mutationOptions,
  queryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { withRequestSignal } from "@/core/api/http";
import { protectOptimisticQuery } from "@/core/api/optimistic-query-persistence";
import { requireCurrentAccount } from "@/features/auth/application/account-session";
import type {
  AccountSessionAccess,
  AccountSessionScope,
} from "@/features/auth/application/mobile-session";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";

const signInRequired = "Inicia sesión para usar tus guardados.";

export function getSavedCollectionQueryOptions<TItem>(
  baseKey: QueryKey,
  list: (request: AuthorizedFetcher) => Promise<readonly TItem[]>,
  auth: AccountSessionAccess,
) {
  const scope = auth.sessionScope;
  return queryOptions({
    queryKey: [...baseKey, scope?.userId ?? "anonymous"],
    queryFn: async ({ signal }) => {
      if (!scope) return [];
      requireCurrentAccount(auth, scope, signInRequired);
      const items = await list(withRequestSignal(auth.request, signal));
      requireCurrentAccount(auth, scope, signInRequired);
      return items;
    },
    enabled: scope !== null,
    gcTime: Infinity,
    staleTime: 5 * 60 * 1_000,
  });
}

export type SavedCollectionOperations<TItem, TVariables> = Readonly<{
  apply: (
    list: readonly TItem[],
    item: TItem,
    currentlySaved: boolean,
  ) => readonly TItem[];
  getItem: (variables: TVariables) => TItem;
  remove: (item: TItem, request: AuthorizedFetcher) => Promise<unknown>;
  save: (item: TItem, request: AuthorizedFetcher) => Promise<unknown>;
}>;

type SavedCollectionContext<TItem> = Readonly<{
  scope: AccountSessionScope;
  queryKey: QueryKey;
  previous: readonly TItem[] | undefined;
  optimistic: readonly TItem[] | undefined;
  completePersistence: (failed: boolean) => void;
}>;

export function getSavedCollectionMutationOptions<
  TItem,
  TVariables extends Readonly<{ currentlySaved: boolean }>,
>(
  client: QueryClient,
  baseKey: QueryKey,
  operations: SavedCollectionOperations<TItem, TVariables>,
  auth: AccountSessionAccess,
) {
  const scope = auth.sessionScope;
  const queryKey = [...baseKey, scope?.userId ?? "anonymous"];
  // Cambiar la clave separa también las opciones de una mutación ya pendiente.
  const mutationKey = [...queryKey, "mutation", scope?.generation ?? null];
  return mutationOptions<
    void,
    Error,
    TVariables,
    SavedCollectionContext<TItem>
  >({
    mutationKey,
    networkMode: "always",
    meta: { accountId: scope?.userId, sessionGeneration: scope?.generation },
    mutationFn: async (variables) => {
      requireCurrentAccount(auth, scope, signInRequired);
      const item = operations.getItem(variables);
      if (variables.currentlySaved) await operations.remove(item, auth.request);
      else await operations.save(item, auth.request);
      requireCurrentAccount(auth, scope, signInRequired);
    },
    onMutate: async (variables) => {
      const currentScope = requireCurrentAccount(auth, scope, signInRequired);
      await client.cancelQueries({ queryKey, exact: true });
      requireCurrentAccount(auth, currentScope, signInRequired);
      const previous = client.getQueryData<readonly TItem[]>(queryKey);
      const optimistic = operations.apply(
        previous ?? [],
        operations.getItem(variables),
        variables.currentlySaved,
      );
      const completePersistence = protectOptimisticQuery(client, queryKey);
      client.setQueryData(queryKey, optimistic);
      return {
        scope: currentScope,
        queryKey,
        previous,
        optimistic: client.getQueryData<readonly TItem[]>(queryKey),
        completePersistence,
      };
    },
    onError: (_error, _variables, context) => {
      if (
        !context ||
        !auth.isCurrentSession(context.scope) ||
        client.getQueryData(context.queryKey) !== context.optimistic
      ) {
        return;
      }
      client.setQueryData(context.queryKey, context.previous ?? []);
    },
    onSettled: (_data, _error, _variables, context) => {
      context?.completePersistence(_error !== null);
      if (
        context &&
        auth.isCurrentSession(context.scope) &&
        client.isMutating({ mutationKey, exact: true }) === 1
      ) {
        return client.invalidateQueries({
          queryKey: context.queryKey,
          exact: true,
        });
      }
    },
  });
}
