import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { EstablishmentMapGroup } from "@/features/establishments/domain/establishment-groups";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

/** Public pins read from a downloaded city, never a remote viewport request. */
export type LocalMapPlace = Readonly<{
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  icon: string;
}>;

/** Actual visible map area, read after the camera settles. */
export type CenterMapViewport = Readonly<{
  center: GeoCoordinate;
  bounds: GeoBoundingBox;
}>;

/** Props shared by the native MapLibre map and its web placeholder. */
export type CenterMapProps = Readonly<{
  /** Offset of the "i" attribution control from the bottom-left corner. */
  attributionInset?: Readonly<{ bottom?: number; left?: number }>;
  centers: readonly PublicCenter[];
  /** Overrides the online style with the style saved alongside the map pack. */
  mapStyleOverride?: StyleSpecification;
  /** Fits the downloaded area once when the map becomes ready. */
  initialBounds?: GeoBoundingBox;
  /** Presence switches the registry source from remote MVT to local GeoJSON. */
  localPlaces?: readonly LocalMapPlace[];
  onLocalPlacePress?: (key: string) => void;
  onLocalPlacesPress?: (keys: readonly string[]) => void;
  /** Published transport geometry chosen in the local city browser. */
  localRoute?: GeoJSON.LineString | null;
  /** Selection padding for an embedded map; full-screen maps keep the default. */
  selectionBottomInset?: number;
  focusBounds?: GeoBoundingBox | null;
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
  /** Reports the initial visible area and the final area after camera moves. */
  onViewportChange?: (viewport: CenterMapViewport) => void;
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
