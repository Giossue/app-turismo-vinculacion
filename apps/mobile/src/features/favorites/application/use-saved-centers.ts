import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  listSavedCenters,
  removeSavedCenter,
  saveCenter,
} from "../data/saved-centers-storage";

export const savedCentersQueryKey = ["saved-centers", "device-v1"] as const;

export function useSavedCenters() {
  return useQuery({
    queryKey: savedCentersQueryKey,
    queryFn: listSavedCenters,
    gcTime: Infinity,
    staleTime: Infinity,
  });
}

export function useSavedCenterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ center, saved }: SavedCenterMutation) => {
      if (saved) {
        await removeSavedCenter(center.code);
      } else {
        await saveCenter(center);
      }
    },
    onMutate: async ({ center, saved }: SavedCenterMutation) => {
      await queryClient.cancelQueries({ queryKey: savedCentersQueryKey });
      const previous =
        queryClient.getQueryData<readonly PublicCenter[]>(savedCentersQueryKey);
      const current = previous ?? [];
      const next = saved
        ? current.filter((item) => item.code !== center.code)
        : [center, ...current.filter((item) => item.code !== center.code)];
      queryClient.setQueryData(savedCentersQueryKey, next);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(savedCentersQueryKey, context.previous);
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
