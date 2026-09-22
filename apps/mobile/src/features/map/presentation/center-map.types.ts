import type { GeoBounds, GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

/** Props shared by the native MapLibre map and its web placeholder. */
export type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  establishments?: readonly PublicMapEstablishment[];
  /** Eases to `focusCoordinate` whenever `focusCoordinateKey` changes. */
  focusCoordinate?: GeoCoordinate | null;
  focusCoordinateKey?: number;
  /** Eases to the user's position whenever this key changes. */
  focusLocationKey?: number;
  focusSelection?: MapFeatureSelection | null;
  onAttributionChange?: (handler: (() => void) | null) => void;
  onBearingChange?: (bearing: number) => void;
  onCenterPress: (center: PublicCenter) => void;
  onEstablishmentPress: (establishment: PublicMapEstablishment) => void;
  onLocationFocusChange?: (focused: boolean) => void;
  onOverlappingFeaturePress: (
    selections: readonly MapFeatureSelection[],
  ) => void;
  onViewportChange: (bounds: GeoBounds) => void;
  /** Rotates the camera back to north whenever this key changes. */
  resetNorthKey?: number;
  selectedCenterCode?: string | null;
  /** `getEstablishmentKey` of the selected establishment. */
  selectedEstablishmentKey?: string | null;
  userLocation?: GeoCoordinate | null;
}>;
