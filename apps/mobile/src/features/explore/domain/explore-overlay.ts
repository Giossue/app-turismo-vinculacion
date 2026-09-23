import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  getEstablishmentKey,
  type PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";

/**
 * The one transient overlay over the Explore map (single source of truth):
 * - `center` / `establishment`: its detail sheet.
 * - `choices`: several pins overlap and the tourist picks one.
 * - `focusing`: the camera moves to a feature; its sheet opens once the map
 *   confirms the camera arrived.
 * - `agent`: the full-height agent chat.
 */
export type ExploreOverlay =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "center"; center: PublicCenter }>
  | Readonly<{ kind: "establishment"; establishment: PublicMapEstablishment }>
  | Readonly<{ kind: "choices"; selections: readonly MapFeatureSelection[] }>
  | Readonly<{ kind: "focusing"; selection: MapFeatureSelection }>
  | Readonly<{ kind: "agent" }>;

export const noExploreOverlay: ExploreOverlay = { kind: "none" };

/**
 * Pins painted as selected: the open sheet's feature, or the feature the
 * camera is focusing before its sheet opens.
 */
export function getSelectedMapFeature(
  overlay: ExploreOverlay,
): MapFeatureSelection | null {
  switch (overlay.kind) {
    case "center":
      return { kind: "center", center: overlay.center };
    case "establishment":
      return { kind: "establishment", establishment: overlay.establishment };
    case "focusing":
      return overlay.selection;
    default:
      return null;
  }
}

export function getSelectedCenterCode(overlay: ExploreOverlay): string | null {
  const selection = getSelectedMapFeature(overlay);
  return selection?.kind === "center" ? selection.center.code : null;
}

export function getSelectedEstablishmentKey(
  overlay: ExploreOverlay,
): string | null {
  const selection = getSelectedMapFeature(overlay);
  return selection?.kind === "establishment"
    ? getEstablishmentKey(selection.establishment)
    : null;
}

/** What the Android Back button closes first on the Explore screen. */
export type ExploreBackAction =
  "closeSearchFocus" | "closeMenu" | "closeOverlay" | "clearSearch" | null;

export function getExploreBackAction({
  menuVisible,
  overlay,
  searchActive,
  searchFocused,
}: Readonly<{
  menuVisible: boolean;
  overlay: ExploreOverlay;
  /** Typed or submitted text, or the nearby services mode. */
  searchActive: boolean;
  searchFocused: boolean;
}>): ExploreBackAction {
  if (searchFocused) return "closeSearchFocus";
  if (menuVisible) return "closeMenu";
  if (overlay.kind !== "none") return "closeOverlay";
  if (searchActive) return "clearSearch";
  return null;
}
