import { useState } from "react";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import {
  getExploreBackAction,
  noExploreOverlay,
  type ExploreBackAction,
  type ExploreOverlay,
} from "../domain/explore-overlay";

/** State of the single overlay over the Explore map. */
export function useExploreOverlay() {
  const [overlay, setOverlay] = useState<ExploreOverlay>(noExploreOverlay);

  return {
    overlay,
    close: () => setOverlay(noExploreOverlay),
    /** Closes the agent only if it is still the open overlay. */
    closeAgent: () =>
      setOverlay((current) =>
        current.kind === "agent" ? noExploreOverlay : current,
      ),
    /** Centers the camera on `selection`; the map then opens its sheet. */
    focusFeature: (selection: MapFeatureSelection) =>
      setOverlay({ kind: "focusing", selection }),
    openAgent: () => setOverlay({ kind: "agent" }),
    selectCenter: (center: PublicCenter) =>
      setOverlay({ kind: "center", center }),
    selectEstablishment: (establishment: PublicMapEstablishment) =>
      setOverlay({ kind: "establishment", establishment }),
    showChoices: (selections: readonly MapFeatureSelection[]) => {
      if (selections.length === 0) return;
      setOverlay(
        selections.length === 1
          ? { kind: "focusing", selection: selections[0] }
          : { kind: "choices", selections },
      );
    },
  };
}

/**
 * Android Back on Explore: closes the focused search, the menu, the open
 * overlay and the search, in that order, before leaving the screen.
 */
export function useExploreBackHandler(
  state: Parameters<typeof getExploreBackAction>[0],
  actions: Readonly<Record<NonNullable<ExploreBackAction>, () => void>>,
) {
  useScreenBackHandler(() => {
    const action = getExploreBackAction(state);
    if (!action) return false;
    actions[action]();
    return true;
  });
}
