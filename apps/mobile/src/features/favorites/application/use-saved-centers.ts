import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  listRemoteSavedCenters,
  removeRemoteCenter,
  saveRemoteCenter,
} from "../data/favorites-api";
import { importLegacySavedCenters } from "./import-legacy-saved-centers";

// The list is persisted for offline use; after a restart it is revalidated
// once it is older than this.
const savedCentersStaleTimeMs = 5 * 60 * 1000;

export function useSavedCenters() {
  const auth = useAuth();

  return useQuery({
    queryKey: [...queryKeys.savedCenters, auth.user?.id ?? "anonymous"],
    queryFn: async () => {
      if (auth.status !== "authenticated") return [];

      await importLegacySavedCenters(auth.request);
      return listRemoteSavedCenters(auth.request);
    },
    enabled: auth.status !== "loading",
    gcTime: Infinity,
    staleTime: savedCentersStaleTimeMs,
  });
}

/**
 * Saves or removes a place. `currentlySaved` is the state the tourist sees
 * before the tap: `true` removes the place, `false` saves it. The list is
 * updated optimistically and rolled back if the API refuses; show the
 * failure with `describeSavedCenterError` (e.g. in a `TourismSnackbar`).
 */
export function useSavedCenterMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [...queryKeys.savedCenters, auth.user?.id ?? "anonymous"];

  return useMutation({
    mutationFn: async (variables: SavedCenterMutation) => {
      if (auth.status !== "authenticated") {
        throw new ApiError("Inicia sesión para usar tus guardados.");
      }
      if (isCurrentlySaved(variables)) {
        await removeRemoteCenter(variables.center.code, auth.request);
      } else {
        await saveRemoteCenter(variables.center.code, auth.request);
      }
    },
    onMutate: async (variables: SavedCenterMutation) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<readonly PublicCenter[]>(queryKey);
      const current = previous ?? [];
      const { center } = variables;
      const next = isCurrentlySaved(variables)
        ? current.filter((item) => item.code !== center.code)
        : [center, ...current.filter((item) => item.code !== center.code)];
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedCenters });
    },
  });
}

/** User-facing message for a failed save/remove. */
export function describeSavedCenterError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "No pudimos actualizar tus guardados.";
}

export type SavedCenterMutation = Readonly<
  { center: PublicCenter } & (
    | { currentlySaved: boolean }
    | {
        /** @deprecated Use `currentlySaved`; `saved: true` removes the place. */
        saved: boolean;
      }
  )
>;

function isCurrentlySaved(variables: SavedCenterMutation): boolean {
  return "currentlySaved" in variables
    ? variables.currentlySaved
    : variables.saved;
}
