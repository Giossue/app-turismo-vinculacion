import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import {
  getOfflineDownloadErrorMessage,
  runOfflineRemoval,
} from "./offline-download-store";
import { removeOfflineCity } from "./offline-removal";

export function useOfflineCityRemoval() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (slug: string) =>
      runOfflineRemoval(slug, () => removeOfflineCity(slug)),
    networkMode: "always",
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.offlineStoredCities,
        }),
        queryClient.invalidateQueries({ queryKey: ["offline-city-manifest"] }),
      ]),
  });
  return {
    remove: mutation.mutateAsync,
    isPending: mutation.isPending,
    removingSlug: mutation.isPending ? (mutation.variables ?? null) : null,
    error: mutation.error
      ? getOfflineDownloadErrorMessage(mutation.error)
      : null,
  };
}
