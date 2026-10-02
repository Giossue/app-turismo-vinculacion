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
  package: Readonly<{
    version: number;
    checksumSha256: string | null;
    zoomMin: number;
    zoomMax: number;
    publishedAt: string | null;
  }>;
  boundary: OfflineGeoJson | null;
  /** Download coverage, in [west, south, east, north] order. */
  bounds: readonly [number, number, number, number];
  centers: readonly OfflineManifestCenter[];
  establishments: readonly OfflineManifestEstablishment[];
  pois: readonly OfflineManifestPoi[];
  routes: readonly OfflineManifestRoute[];
}>;

export type OfflineManifestEstablishment = Readonly<{
  name: string;
  activity: string;
  classification: string | null;
  category: string | null;
  categoryLabel: string | null;
  address: string | null;
  phone: string | null;
  localityName: string;
  latitude: number;
  longitude: number;
  approximate: boolean;
  icon: string;
  group: string | null;
}>;

export type OfflineManifestPoi = Readonly<{
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  icon: string;
}>;

export type OfflineManifestCenter = Readonly<{
  code: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  category: string;
  type: string;
  subtype: string;
  hierarchy: string | null;
  categoryCode: string;
  typeCode: string;
  subtypeCode: string;
  provinceCode: string;
  cantonCode: string;
  parishCode: string;
  hierarchyCode: string | null;
}>;

export type OfflineManifestRoute = Readonly<{
  key: string;
  /** Unique public identity; legacy key remains compatible with older clients. */
  publicKey: string;
  name: string;
  origin: string;
  destination: string;
  durationMinutes: number | null;
  durationEstimated: boolean;
  transportCode: string | null;
  distanceMeters: number | null;
  geometry: OfflineGeoJsonLineString;
  directions: readonly unknown[];
}>;

export class OfflineCityAreaUnavailableError extends Error {
  constructor() {
    super("La ciudad no tiene una zona de descarga definida.");
    this.name = "OfflineCityAreaUnavailableError";
  }
}
export type OfflineGeoJson = Readonly<Record<string, unknown>>;
export type OfflineGeoJsonLineString = Readonly<{
  type: "LineString";
  coordinates: readonly (readonly [number, number])[];
}>;
