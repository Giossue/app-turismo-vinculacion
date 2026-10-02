import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import type { PublicSearchResult } from "./search-result";

export type SearchSuggestionItem = Readonly<{
  key: string;
  title: string;
  subtitle: string;
  kind: "center" | "establishment" | "geographic" | "poi" | "route";
  distanceMeters: number | null;
  /** Shared text ranking tier, never displayed in the interface. */
  relevance?: number;
  result?: PublicSearchResult;
  offline?: Readonly<{ slug: string; itemKey: string; cityName: string }>;
}>;

export type SearchViewport = Readonly<{
  center: GeoCoordinate;
  bounds: GeoBoundingBox;
}>;

export type SearchScope = "area" | "country";
export type SearchFilters = Readonly<{
  kind?: PublicSearchResult["kind"];
  bounds?: GeoBoundingBox | null;
}>;

export type OfflineSearchCoverage = Readonly<{ slug: string; name: string }>;

/** Rejects incomplete/nonfinite viewports instead of broadening a local search. */
export function isValidSearchBounds(
  bounds: GeoBoundingBox | null | undefined,
): bounds is GeoBoundingBox {
  return Boolean(
    bounds &&
    bounds.every(Number.isFinite) &&
    bounds[0] >= -180 &&
    bounds[2] <= 180 &&
    bounds[1] >= -90 &&
    bounds[3] <= 90 &&
    bounds[0] < bounds[2] &&
    bounds[1] < bounds[3],
  );
}

export function isInsideSearchBounds(
  coordinate: GeoCoordinate,
  bounds: GeoBoundingBox,
): boolean {
  return (
    coordinate.longitude >= bounds[0] &&
    coordinate.longitude <= bounds[2] &&
    coordinate.latitude >= bounds[1] &&
    coordinate.latitude <= bounds[3]
  );
}
