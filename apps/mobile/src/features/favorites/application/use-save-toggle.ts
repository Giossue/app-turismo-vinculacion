import type { UseMutationResult } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/application/auth-context";
import { showSaveToast } from "../presentation/save-toast";
import { savedCollectionLabels } from "./use-saved-collection";

/**
 * Saved state of one item for the signed-in tourist. Guests are sent to
 * `onRequireAuth` instead of saving. `buildVariables` receives the state
 * before the tap, so the mutation can save or remove accordingly.
 */
export function useSaveToggle<TVariables, TContext>(
  options: Readonly<{
    buildVariables: (currentlySaved: boolean) => TVariables;
    mutation: UseMutationResult<void, Error, TVariables, TContext>;
    onRequireAuth: () => void;
    saveLabel: string;
    saved: boolean;
  }>,
) {
  const auth = useAuth();
  const { buildVariables, mutation, onRequireAuth, saveLabel, saved } = options;

  const toggle = () => {
    if (auth.status !== "authenticated") {
      onRequireAuth();
      return;
    }
    mutation.mutate(buildVariables(saved), {
      onSuccess: () => showSaveToast(saved),
    });
  };

  return {
    accessibilityLabel: saved ? savedCollectionLabels.removeLabel : saveLabel,
    mutation,
    saved,
    toggle,
  };
}
