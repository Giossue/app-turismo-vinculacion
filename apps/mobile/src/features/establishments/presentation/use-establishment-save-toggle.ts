import { useAuth } from "@/features/auth/application/auth-context";
import {
  useSavedEstablishmentMutation,
  useSavedEstablishments,
} from "@/features/favorites/application/use-saved-establishments";
import { toSavedEstablishment } from "@/features/favorites/domain/saved-establishment";
import type {
  PublicEstablishmentDetail,
  PublicMapEstablishment,
} from "../domain/establishment";

/**
 * Saved state of a registry establishment, mirroring `useCenterSaveToggle`:
 * guests are sent to `onRequireAuth`. Returns null for pins without an id
 * (offline POIs), which cannot be saved.
 */
export function useEstablishmentSaveToggle(
  establishment: PublicMapEstablishment,
  detail: PublicEstablishmentDetail | undefined,
  onRequireAuth: () => void,
) {
  const auth = useAuth();
  const savedEstablishments = useSavedEstablishments();
  const mutation = useSavedEstablishmentMutation();
  const { id } = establishment;
  if (id === undefined) return null;
  const saved =
    savedEstablishments.data?.some((item) => item.id === id) ?? false;

  const toggle = () => {
    if (auth.status !== "authenticated") {
      onRequireAuth();
      return;
    }
    mutation.mutate({
      establishment: toSavedEstablishment({ ...establishment, id }, detail),
      currentlySaved: saved,
    });
  };

  return {
    accessibilityLabel: saved
      ? "Quitar de guardados"
      : "Guardar establecimiento",
    mutation,
    saved,
    toggle,
  };
}
