import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  listRemoteSavedEstablishments,
  removeRemoteEstablishment,
  saveRemoteEstablishment,
} from "../data/favorites-api";
import {
  toggleSavedEstablishment,
  type SavedEstablishment,
} from "../domain/saved-establishment";

// Same policy as saved centers: persisted for offline use, revalidated later.
const savedEstablishmentsStaleTimeMs = 5 * 60 * 1000;

export function useSavedEstablishments() {
  const auth = useAuth();

  return useQuery({
    queryKey: [...queryKeys.savedEstablishments, auth.user?.id ?? "anonymous"],
    queryFn: async () => {
      if (auth.status !== "authenticated") return [];
      return listRemoteSavedEstablishments(auth.request);
    },
    enabled: auth.status !== "loading",
    gcTime: Infinity,
    staleTime: savedEstablishmentsStaleTimeMs,
  });
}

/**
 * Saves or removes a registry establishment, like `useSavedCenterMutation`:
 * optimistic list update, rollback on failure (show it with
 * `SavedCenterErrorSnackbar`) and a refetch once settled.
 */
export function useSavedEstablishmentMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [
    ...queryKeys.savedEstablishments,
    auth.user?.id ?? "anonymous",
  ];

  return useMutation({
    mutationFn: async (variables: SavedEstablishmentMutation) => {
      if (auth.status !== "authenticated") {
        throw new ApiError("Inicia sesión para usar tus guardados.");
      }
      const { id } = variables.establishment;
      if (variables.currentlySaved) {
        await removeRemoteEstablishment(id, auth.request);
      } else {
        await saveRemoteEstablishment(id, auth.request);
      }
    },
    onMutate: async (variables: SavedEstablishmentMutation) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<readonly SavedEstablishment[]>(queryKey);
      queryClient.setQueryData(
        queryKey,
        toggleSavedEstablishment(
          previous ?? [],
          variables.establishment,
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.savedEstablishments,
      });
    },
  });
}

export type SavedEstablishmentMutation = Readonly<{
  establishment: SavedEstablishment;
  currentlySaved: boolean;
}>;
