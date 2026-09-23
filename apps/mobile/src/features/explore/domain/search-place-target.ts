import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import type { PublicSearchResult } from "@/features/search/domain/search-result";

/**
 * What picking a search result does on the map:
 * - `feature`: focus the camera on a center or establishment and then open
 *   its sheet, exactly like tapping its pin.
 * - `coordinate`: move the camera to a geographic place with no sheet.
 */
export type SearchPlaceTarget =
  | Readonly<{ kind: "feature"; selection: MapFeatureSelection }>
  | Readonly<{ kind: "coordinate"; coordinate: GeoCoordinate; title: string }>;

/** Pin used for establishments whose result carries no icon. */
export type FallbackEstablishmentPin = Readonly<{ key: string }>;

/**
 * Resolves a public search result. Centers prefer the loaded map copy; a
 * center outside the loaded list is rebuilt from the result when it carries
 * the whole classification, and ignored otherwise.
 */
export function getSearchPlaceTarget(
  place: PublicSearchResult,
  centers: readonly PublicCenter[],
  fallbackPin: FallbackEstablishmentPin,
): SearchPlaceTarget | null {
  if (place.kind === "center" && place.centerCode) {
    const center =
      centers.find((candidate) => candidate.code === place.centerCode) ??
      searchResultToCenter(place, place.centerCode);
    return center
      ? { kind: "feature", selection: { kind: "center", center } }
      : null;
  }
  if (place.kind === "establishment") {
    return {
      kind: "feature",
      selection: {
        kind: "establishment",
        establishment: {
          name: place.title,
          category: place.category ?? null,
          categoryLabel: place.subtitle || place.category,
          latitude: place.latitude,
          longitude: place.longitude,
          approximate: place.approximate ?? false,
          icon: place.icon ?? fallbackPin.key,
        },
      },
    };
  }
  return {
    kind: "coordinate",
    coordinate: { latitude: place.latitude, longitude: place.longitude },
    title: place.title,
  };
}

function searchResultToCenter(
  place: PublicSearchResult,
  code: string,
): PublicCenter | null {
  const {
    cantonCode,
    category,
    categoryCode,
    parishCode,
    provinceCode,
    subtype,
    subtypeCode,
    type,
    typeCode,
  } = place;
  if (
    !category ||
    !type ||
    !subtype ||
    !categoryCode ||
    !typeCode ||
    !subtypeCode ||
    !provinceCode ||
    !cantonCode ||
    !parishCode
  ) {
    return null;
  }
  return {
    code,
    name: place.title,
    description: null,
    latitude: place.latitude,
    longitude: place.longitude,
    category,
    type,
    subtype,
    hierarchy: place.hierarchy ?? null,
    categoryCode,
    typeCode,
    subtypeCode,
    provinceCode,
    cantonCode,
    parishCode,
    hierarchyCode: place.hierarchyCode ?? null,
  };
}
