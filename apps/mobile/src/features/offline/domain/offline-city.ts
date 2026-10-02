import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import type { GeoBoundingBox } from "@/core/geo/types";

export type OfflineEstablishment = Readonly<{
  name: string;
  category: string | null;
  categoryLabel: string | null;
  latitude: number;
  longitude: number;
  approximate: boolean;
  icon: string;
  group: string | null;
  activity: string;
  classification: string | null;
  address: string | null;
  phone: string | null;
  localityName: string;
}>;

export type OfflinePoi = Readonly<{
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  icon: string;
}>;

export type OfflineCity = Readonly<{
  slug: string;
  name: string;
  canton: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  package: Readonly<{
    version: number;
    checksumSha256: string | null;
    zoomMin: number;
    zoomMax: number;
    publishedAt: string | null;
  }> | null;
}>;

export type OfflineCityManifest = Readonly<{
  city: OfflineCity;
  package: NonNullable<OfflineCity["package"]>;
  boundary: Readonly<Record<string, unknown>> | null;
  bounds?: GeoBoundingBox;
  centers: readonly PublicCenter[];
  establishments: readonly OfflineEstablishment[];
  pois: readonly OfflinePoi[];
  /** Device metadata is persisted with the manifest in one atomic write. */
  download?: Readonly<{
    savedAt: string;
    packId: string;
    resourceSizeBytes: number | null;
    bounds: GeoBoundingBox;
    mapStyles: Readonly<{
      light: StyleSpecification;
      dark: StyleSpecification;
    }>;
  }>;
  routes: readonly Readonly<{
    key: string;
    publicKey?: string;
    transportCode?: string | null;
    distanceMeters?: number | null;
    name: string;
    origin: string;
    destination: string;
    durationMinutes: number | null;
    durationEstimated: boolean;
    geometry: GeoJSON.LineString;
    directions: readonly unknown[];
  }>[];
}>;
