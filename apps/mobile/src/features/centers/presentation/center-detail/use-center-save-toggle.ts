import { useAuth } from "@/features/auth/application/auth-context";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import type { PublicCenter } from "../../domain/public-center";

/**
 * Saved state of `center` for the signed-in tourist. Guests are sent to
 * `onRequireAuth` instead of saving.
 */
export function useCenterSaveToggle(
  center: PublicCenter,
  onRequireAuth: () => void,
) {
  const auth = useAuth();
  const savedCenters = useSavedCenters();
  const mutation = useSavedCenterMutation();
  const saved =
    savedCenters.data?.some((savedCenter) => savedCenter.code === center.code) ??
    false;

  const toggle = () => {
    if (auth.status !== "authenticated") {
      onRequireAuth();
      return;
    }
    mutation.mutate({ center, saved });
  };

  return {
    accessibilityLabel: saved ? "Quitar de guardados" : "Guardar centro turístico",
    saved,
    toggle,
  };
}
