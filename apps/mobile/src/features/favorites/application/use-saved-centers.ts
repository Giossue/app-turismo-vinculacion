import { queryKeys } from "@/core/api/query-keys";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  listRemoteSavedCenters,
  removeRemoteCenter,
  saveRemoteCenter,
} from "../data/favorites-api";
import { importLegacySavedCenters } from "./import-legacy-saved-centers";
import {
  describeSavedCollectionError,
  useSavedCollection,
  useSavedCollectionMutation,
} from "./use-saved-collection";

export function useSavedCenters() {
  return useSavedCollection<PublicCenter>(
    queryKeys.savedCenters,
    async (request) => {
      await importLegacySavedCenters(request);
      return listRemoteSavedCenters(request);
    },
  );
}

/**
 * Saves or removes a place. `currentlySaved` is the state the tourist sees
 * before the tap: `true` removes the place, `false` saves it. The list is
 * updated optimistically and rolled back if the API refuses; show the
 * failure with `describeSavedCenterError` (e.g. in a `TourismSnackbar`).
 */
export function useSavedCenterMutation() {
  return useSavedCollectionMutation<PublicCenter, SavedCenterMutation>(
    queryKeys.savedCenters,
    {
      apply: (list, center, currentlySaved) => {
        const rest = list.filter((item) => item.code !== center.code);
        return currentlySaved ? rest : [center, ...rest];
      },
      getItem: (variables) => variables.center,
      remove: (center, request) => removeRemoteCenter(center.code, request),
      save: (center, request) => saveRemoteCenter(center.code, request),
    },
  );
}

/** User-facing message for a failed save/remove. */
export const describeSavedCenterError = describeSavedCollectionError;

export type SavedCenterMutation = Readonly<{
  center: PublicCenter;
  currentlySaved: boolean;
}>;
