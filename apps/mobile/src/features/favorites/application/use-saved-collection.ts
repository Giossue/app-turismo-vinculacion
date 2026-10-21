import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { ApiError } from "@/core/api/http";
import { useAuth } from "@/features/auth/application/auth-context";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import {
  getSavedCollectionMutationOptions,
  getSavedCollectionQueryOptions,
  type SavedCollectionOperations,
} from "./saved-collection-options";
import { liveMessages } from "@/core/i18n/language";

export const savedCollectionLabels = liveMessages((all) => all.community.saved);

/** Colección de la cuenta actual, con cancelación y acceso sin conexión. */
export function useSavedCollection<TItem>(
  baseKey: QueryKey,
  list: (request: AuthorizedFetcher) => Promise<readonly TItem[]>,
) {
  const auth = useAuth();
  return useQuery(getSavedCollectionQueryOptions(baseKey, list, auth));
}

/** La actualización optimista y su reversión pertenecen a la sesión de origen. */
export function useSavedCollectionMutation<
  TItem,
  TVariables extends Readonly<{ currentlySaved: boolean }>,
>(baseKey: QueryKey, options: SavedCollectionOperations<TItem, TVariables>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation(
    getSavedCollectionMutationOptions(queryClient, baseKey, options, auth),
  );
}

/** Mensaje visible para un guardado o una eliminación fallidos. */
export function describeSavedCollectionError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : savedCollectionLabels.updateFailed;
}
