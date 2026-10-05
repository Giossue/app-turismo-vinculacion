import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { ApiError } from "@/core/api/http";
import { useAuth } from "@/features/auth/application/auth-context";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";

// Saved lists are persisted for offline use; after a restart they are
// revalidated once older than this.
const savedCollectionStaleTimeMs = 5 * 60 * 1000;

export const savedCollectionLabels = {
  removeLabel: "Quitar de guardados",
  signInRequired: "Inicia sesión para usar tus guardados.",
  updateFailed: "No pudimos actualizar tus guardados.",
} as const;

/**
 * Saved list of the signed-in tourist. Guests get an empty list without a
 * request; `list` runs once the session is known.
 */
export function useSavedCollection<TItem>(
  baseKey: QueryKey,
  list: (request: AuthorizedFetcher) => Promise<readonly TItem[]>,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [...baseKey, auth.user?.id ?? "anonymous"],
    queryFn: async () => {
      if (auth.status !== "authenticated") return [];
      return list(auth.request);
    },
    enabled: auth.status !== "loading",
    gcTime: Infinity,
    staleTime: savedCollectionStaleTimeMs,
  });
}

/**
 * Saves or removes an item. `currentlySaved` is the state the tourist sees
 * before the tap: `true` removes, `false` saves. The list is updated
 * optimistically with `apply`, rolled back if the API refuses (show it with
 * `describeSavedCollectionError`) and refetched once settled.
 */
export function useSavedCollectionMutation<
  TItem,
  TVariables extends Readonly<{ currentlySaved: boolean }>,
>(
  baseKey: QueryKey,
  options: Readonly<{
    apply: (
      list: readonly TItem[],
      item: TItem,
      currentlySaved: boolean,
    ) => readonly TItem[];
    getItem: (variables: TVariables) => TItem;
    remove: (item: TItem, request: AuthorizedFetcher) => Promise<unknown>;
    save: (item: TItem, request: AuthorizedFetcher) => Promise<unknown>;
  }>,
) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [...baseKey, auth.user?.id ?? "anonymous"];

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (auth.status !== "authenticated") {
        throw new ApiError(savedCollectionLabels.signInRequired);
      }
      const item = options.getItem(variables);
      if (variables.currentlySaved) {
        await options.remove(item, auth.request);
      } else {
        await options.save(item, auth.request);
      }
    },
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<readonly TItem[]>(queryKey);
      queryClient.setQueryData(
        queryKey,
        options.apply(
          previous ?? [],
          options.getItem(variables),
          variables.currentlySaved,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: baseKey });
    },
  });
}

/** User-facing message for a failed save/remove. */
export function describeSavedCollectionError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : savedCollectionLabels.updateFailed;
}
