import type { GeoCoordinate } from "@/core/geo/types";
import type { CalculatedRoute } from "../domain/routing";

/** Props shared by the native route map and its web placeholder. */
export type RouteMapProps = Readonly<{
  /** Distance from the bottom edge to the attribution control, above panels. */
  attributionBottom?: number;
  /** Position drawn as the navigation arrow while navigating. */
  currentLocation?: GeoCoordinate | null;
  destination: GeoCoordinate;
  /**
   * While navigating, the camera follows the position and heading. Owned by
   * the screen: a map gesture asks to pause it with `onFollowingChange`.
   */
  following?: boolean;
  navigationActive?: boolean;
  onFollowingChange?: (following: boolean) => void;
  /** Called when the tourist starts moving the map with a gesture. */
  onUserInteraction?: () => void;
  origin: GeoCoordinate | null;
  route: CalculatedRoute | null;
}>;
