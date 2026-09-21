import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/application/auth-context";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  listSavedCenters,
  replaceSavedCenters,
  removeSavedCenter,
  saveCenter,
} from "../data/saved-centers-storage";
import {
  listRemoteSavedCenters,
  removeRemoteCenter,
  saveRemoteCenter,
} from "../data/favorites-api";

export const savedCentersQueryKey = ["saved-centers", "device-v1"] as const;

export function useSavedCenters() {
  const auth = useAuth();

  return useQuery({
    queryKey: [...savedCentersQueryKey, auth.user?.id ?? "anonymous"],
    queryFn: async () => {
      if (auth.status !== "authenticated") return [];

      const local = await listSavedCenters();
      await Promise.allSettled(
        local.map((center) => saveRemoteCenter(center.code, auth.request)),
      );
      try {
        const remote = await listRemoteSavedCenters(auth.request);
        await replaceSavedCenters(remote);
        return remote;
      } catch {
        return local;
      }
    },
    enabled: auth.status !== "loading",
    gcTime: Infinity,
    staleTime: Infinity,
  });
}

export function useSavedCenterMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [...savedCentersQueryKey, auth.user?.id ?? "anonymous"];

  return useMutation({
    mutationFn: async ({ center, saved }: SavedCenterMutation) => {
      if (auth.status !== "authenticated") {
        throw new Error("Inicia sesión para usar tus guardados.");
      }
      if (saved) {
        await removeRemoteCenter(center.code, auth.request);
        await removeSavedCenter(center.code);
      } else {
        await saveRemoteCenter(center.code, auth.request);
        await saveCenter(center);
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
      void queryClient.invalidateQueries({ queryKey: savedCentersQueryKey });
    },
  });
}

type SavedCenterMutation = Readonly<{
  center: PublicCenter;
  saved: boolean;
}>;
