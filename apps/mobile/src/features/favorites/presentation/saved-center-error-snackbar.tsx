import { useState } from "react";

import { TourismSnackbar } from "@/core/ui/tourism-snackbar";
import { describeSavedCenterError } from "../application/use-saved-centers";

/**
 * Tells the tourist that a save/remove failed and the bookmark was
 * restored. Pass the mutation from `useSavedCenterMutation`. Each failure is
 * shown once; the message stays stable while the snackbar hides.
 */
export function SavedCenterErrorSnackbar({
  mutation,
}: Readonly<{ mutation: Readonly<{ error: unknown }> }>) {
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const { error } = mutation;
  return (
    <TourismSnackbar
      message={describeSavedCenterError(error)}
      onDismiss={() => setDismissedError(error)}
      visible={Boolean(error) && error !== dismissedError}
    />
  );
}
