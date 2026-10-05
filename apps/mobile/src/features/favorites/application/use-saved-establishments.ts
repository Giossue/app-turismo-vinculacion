import { queryKeys } from "@/core/api/query-keys";
import {
  listRemoteSavedEstablishments,
  removeRemoteEstablishment,
  saveRemoteEstablishment,
} from "../data/favorites-api";
import {
  toggleSavedEstablishment,
  type SavedEstablishment,
} from "../domain/saved-establishment";
import {
  useSavedCollection,
  useSavedCollectionMutation,
} from "./use-saved-collection";

export function useSavedEstablishments() {
  return useSavedCollection<SavedEstablishment>(
    queryKeys.savedEstablishments,
    listRemoteSavedEstablishments,
  );
}

/**
 * Saves or removes a registry establishment, like `useSavedCenterMutation`:
 * optimistic list update, rollback on failure (show it with
 * `SavedCenterErrorSnackbar`) and a refetch once settled.
 */
export function useSavedEstablishmentMutation() {
  return useSavedCollectionMutation<
    SavedEstablishment,
    SavedEstablishmentMutation
  >(queryKeys.savedEstablishments, {
    apply: toggleSavedEstablishment,
    getItem: (variables) => variables.establishment,
    remove: (establishment, request) =>
      removeRemoteEstablishment(establishment.id, request),
    save: (establishment, request) =>
      saveRemoteEstablishment(establishment.id, request),
  });
}

export type SavedEstablishmentMutation = Readonly<{
  establishment: SavedEstablishment;
  currentlySaved: boolean;
}>;
