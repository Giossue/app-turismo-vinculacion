import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  listRemoteSavedCenters,
  removeRemoteCenter,
  saveRemoteCenter,
} from "../data/favorites-api";
import { importLegacySavedCenters } from "./import-legacy-saved-centers";

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
    staleTime: Infinity,
  });
}

export function useSavedCenterMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [...queryKeys.savedCenters, auth.user?.id ?? "anonymous"];

  return useMutation({
    mutationFn: async ({ center, saved }: SavedCenterMutation) => {
      if (auth.status !== "authenticated") {
        throw new Error("Inicia sesión para usar tus guardados.");
      }
      if (saved) {
        await removeRemoteCenter(center.code, auth.request);
      } else {
        await saveRemoteCenter(center.code, auth.request);
      }
    },
    onMutate: async ({ center, saved }: SavedCenterMutation) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<readonly PublicCenter[]>(queryKey);
      const current = previous ?? [];
      const next = saved
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

type SavedCenterMutation = Readonly<{
  center: PublicCenter;
  saved: boolean;
}>;
