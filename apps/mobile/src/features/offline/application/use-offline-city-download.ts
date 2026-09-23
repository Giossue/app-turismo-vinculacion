import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { queryKeys } from "@/core/api/query-keys";
import { downloadOfflineCity } from "@/features/offline/application/offline-download";
import type { OfflineCity } from "../domain/offline-city";
import {
  getOfflineDownloadErrorMessage,
  getOfflineDownloadsSnapshot,
  runOfflineDownload,
  subscribeOfflineDownloads,
} from "./offline-download-store";

/**
 * Starts city downloads and exposes the ones in flight with their progress.
 * Downloads keep running (and stay visible) after leaving the screen, and a
 * city already downloading is never downloaded twice at the same time.
 */
export function useOfflineCityDownload() {
  const queryClient = useQueryClient();
  const downloads = useSyncExternalStore(
    subscribeOfflineDownloads,
    getOfflineDownloadsSnapshot,
  );
  const mutation = useMutation({
    mutationFn: (city: OfflineCity) =>
      runOfflineDownload(city.slug, (onProgress) =>
        downloadOfflineCity(city, onProgress),
      ),
    // Mutation-level callback: it also runs if the screen was closed.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.offlineStoredCities,
      }),
  });

  return {
    downloads,
    error: mutation.error
      ? getOfflineDownloadErrorMessage(mutation.error)
      : null,
    start: (city: OfflineCity) => mutation.mutate(city),
  };
}
