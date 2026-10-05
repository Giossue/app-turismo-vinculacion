import { useSaveToggle } from "@/features/favorites/application/use-save-toggle";
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
  const savedEstablishments = useSavedEstablishments();
  const mutation = useSavedEstablishmentMutation();
  const { id } = establishment;
  const saved =
    id !== undefined &&
    (savedEstablishments.data?.some((item) => item.id === id) ?? false);

  // Hooks run unconditionally; the null result is decided afterwards.
  const toggle = useSaveToggle({
    buildVariables: (currentlySaved) => ({
      establishment: toSavedEstablishment(
        { ...establishment, id: id ?? Number.NaN },
        detail,
      ),
      currentlySaved,
    }),
    mutation,
    onRequireAuth,
    saveLabel: "Guardar establecimiento",
    saved,
  });

  return id === undefined ? null : toggle;
}
