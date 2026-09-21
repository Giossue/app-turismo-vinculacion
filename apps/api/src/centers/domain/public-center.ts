export type BoundingBox = Readonly<{
  west: number;
  south: number;
  east: number;
  north: number;
}>;

export type PublicCenter = Readonly<{
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

export type NearbyPublicCenter = PublicCenter &
  Readonly<{
    distanceMeters: number;
  }>;

export type NearbyPublicCenterPage = Readonly<{
  items: readonly NearbyPublicCenter[];
}>;

export type PublicCenterDetail = PublicCenter &
  Readonly<{
    touristZone: string;
    address: string | null;
    altitudeMeters: number | null;
    admission: Readonly<{
      type: string;
      attention: string;
      opensAt: string | null;
      closesAt: string | null;
      priceFrom: number | null;
      priceTo: number | null;
    }> | null;
    activities: readonly string[];
    accessibility: readonly string[];
    facilities: readonly string[];
    photos: readonly Readonly<{
      id: number;
      url: string;
      mimeType: string;
      description: string | null;
    }>[];
  }>;

export type DiscoveryCatalog = Readonly<{
  categories: readonly Readonly<{ code: string; name: string }>[];
  types: readonly Readonly<{
    code: string;
    name: string;
    categoryCode: string;
  }>[];
  subtypes: readonly Readonly<{
    code: string;
    name: string;
    typeCode: string;
  }>[];
  provinces: readonly Readonly<{ code: string; name: string }>[];
  cantons: readonly Readonly<{
    code: string;
    name: string;
    provinceCode: string;
  }>[];
  parishes: readonly Readonly<{
    code: string;
    name: string;
    cantonCode: string;
  }>[];
  hierarchies: readonly Readonly<{ code: string; name: string }>[];
}>;

export type PublicCenterPage = Readonly<{
  items: readonly PublicCenter[];
  total: number;
}>;
