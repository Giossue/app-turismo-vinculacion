/** A WGS84 point expressed in decimal degrees. */
export type GeoCoordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

/** A WGS84 bounding box expressed in decimal degrees. */
export type GeoBounds = Readonly<{
  west: number;
  south: number;
  east: number;
  north: number;
}>;

/** `[west, south, east, north]`, the bbox order used by GeoJSON and MapLibre. */
export type GeoBoundingBox = [number, number, number, number];
