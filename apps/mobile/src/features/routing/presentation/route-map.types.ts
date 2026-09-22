import type { GeoCoordinate } from "@/core/geo/types";
import type { CalculatedRoute } from "../domain/routing";

/** Props shared by the native route map and its web placeholder. */
export type RouteMapProps = Readonly<{
  /** Position drawn as the navigation arrow while navigating. */
  currentLocation?: GeoCoordinate | null;
  destination: GeoCoordinate;
  navigationActive?: boolean;
  /** Called when the tourist starts moving the map with a gesture. */
  onUserInteraction?: () => void;
  origin: GeoCoordinate | null;
  /** Re-centers (and resumes following) whenever this key changes. */
  recenterKey?: number;
  route: CalculatedRoute | null;
}>;
