import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { EstablishmentMapGroup } from "@/features/establishments/domain/establishment-groups";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

/** Props shared by the native MapLibre map and its web placeholder. */
export type CenterMapProps = Readonly<{
  /** Offset of the "i" attribution control from the bottom-left corner. */
  attributionInset?: Readonly<{ bottom?: number; left?: number }>;
  centers: readonly PublicCenter[];
  /** Registry pins (vector tiles): hidden, all, or only one map group. */
  establishmentLayer: Readonly<{
    visible: boolean;
    group?: EstablishmentMapGroup;
  }>;
  /** Eases to `focusCoordinate` whenever `focusCoordinateKey` changes. */
  focusCoordinate?: GeoCoordinate | null;
  focusCoordinateKey?: number;
  /** Eases to the user's position whenever this key changes. */
  focusLocationKey?: number;
  focusSelection?: MapFeatureSelection | null;
  /** Called on every camera frame; keep it cheap (see `MapCompass`). */
  onBearingChange?: (bearing: number) => void;
  onCenterPress: (center: PublicCenter) => void;
  onEstablishmentPress: (establishment: PublicMapEstablishment) => void;
  onLocationFocusChange?: (focused: boolean) => void;
  onOverlappingFeaturePress: (
    selections: readonly MapFeatureSelection[],
  ) => void;
  /** Rotates the camera back to north whenever this key changes. */
  resetNorthKey?: number;
  userLocation?: GeoCoordinate | null;
}>;
