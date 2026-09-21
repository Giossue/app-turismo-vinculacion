import type {
  BoundingBox,
  DiscoveryCatalog,
  NearbyPublicCenterPage,
  PublicCenterDetail,
  PublicCenterPage,
} from "../domain/public-center";

export const PUBLIC_CENTER_REPOSITORY = Symbol("PUBLIC_CENTER_REPOSITORY");

export type NearbyPublishedCentersQuery = Readonly<{
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category?: string;
  limit: number;
}>;

export type ListPublishedCentersQuery = Readonly<{
  text?: string;
  bounds?: BoundingBox;
  categoryCode?: string;
  typeCode?: string;
  subtypeCode?: string;
  provinceCode?: string;
  cantonCode?: string;
  parishCode?: string;
  hierarchyCode?: string;
  limit: number;
}>;

export interface PublicCenterRepository {
  listPublished(query: ListPublishedCentersQuery): Promise<PublicCenterPage>;
  listNearbyPublished(
    query: NearbyPublishedCentersQuery,
  ): Promise<NearbyPublicCenterPage>;
  findPublishedByCode(code: string): Promise<PublicCenterDetail | null>;
  getDiscoveryCatalog(): Promise<DiscoveryCatalog>;
}
