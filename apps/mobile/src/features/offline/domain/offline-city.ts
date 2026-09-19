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
  centers: readonly Readonly<{
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
  }>[];
  routes: readonly Readonly<{
    key: string;
    name: string;
    origin: string;
    destination: string;
    durationMinutes: number | null;
    durationEstimated: boolean;
    geometry: GeoJSON.LineString;
    directions: readonly unknown[];
  }>[];
}>;
