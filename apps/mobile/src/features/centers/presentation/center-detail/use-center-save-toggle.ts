import { useSaveToggle } from "@/features/favorites/application/use-save-toggle";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import type { PublicCenter } from "../../domain/public-center";

/**
 * Saved state of `center` for the signed-in tourist. Guests are sent to
 * `onRequireAuth` instead of saving. Render `SavedCenterErrorSnackbar` with
 * the returned `mutation` so a failed save is not silently rolled back.
 */
export function useCenterSaveToggle(
  center: PublicCenter,
  onRequireAuth: () => void,
) {
  const savedCenters = useSavedCenters();
  const mutation = useSavedCenterMutation();
  const saved =
    savedCenters.data?.some(
      (savedCenter) => savedCenter.code === center.code,
    ) ?? false;

  return useSaveToggle({
    buildVariables: (currentlySaved) => ({ center, currentlySaved }),
    mutation,
    onRequireAuth,
    saveLabel: "Guardar centro turístico",
    saved,
  });
}
