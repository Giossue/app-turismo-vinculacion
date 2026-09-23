import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";

/**
 * The one transient overlay over the Explore map (single source of truth):
 * - `center` / `establishment`: its detail sheet.
 * - `choices`: several pins overlap and the tourist picks one.
 * - `focusing`: a feature picked from search; the map opens its sheet right
 *   away and moves the camera at the same time.
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
