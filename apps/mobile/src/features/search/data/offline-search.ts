import { getDistanceMeters } from "@/core/geo/distance";
import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import { getOfflineBrowserItems } from "@/features/offline/presentation/offline-city-browser";
import {
  deduplicateSearchSuggestions,
  getSearchRelevance,
  normalizeSearchText,
  rankSearchSuggestions,
} from "../domain/search-relevance";
import type { PublicSearchResult } from "../domain/search-result";
import {
  isInsideSearchBounds,
  type SearchFilters,
  type SearchSuggestionItem,
  type OfflineSearchCoverage,
} from "../domain/search-suggestion";

function placeKey(
  kind: SearchSuggestionItem["kind"],
  name: string,
  coordinate: GeoCoordinate,
): string {
  return `${kind}:${normalizeSearchText(name)}:${coordinate.latitude.toFixed(5)}:${coordinate.longitude.toFixed(5)}`;
}

/** Clip each published segment against the visible rectangle, including edges. */
function routeIntersectsBounds(
  coordinates: readonly GeoJSON.Position[],
  bounds: GeoBoundingBox,
): boolean {
  for (let index = 1; index < coordinates.length; index += 1) {
    const first = coordinates[index - 1]!;
    const second = coordinates[index]!;
    let enter = 0;
    let exit = 1;
    let intersects = true;
    for (const axis of [0, 1] as const) {
      const start = first[axis];
      const finish = second[axis];
      if (
        start === undefined ||
        finish === undefined ||
        !Number.isFinite(start) ||
        !Number.isFinite(finish)
      ) {
        intersects = false;
        break;
      }
      const minimum = bounds[axis];
      const maximum = bounds[axis + 2]!;
      const delta = finish - start;
      if (delta === 0) {
        if (start < minimum || start > maximum) intersects = false;
      } else {
        const firstEdge = (minimum - start) / delta;
        const secondEdge = (maximum - start) / delta;
        enter = Math.max(enter, Math.min(firstEdge, secondEdge));
        exit = Math.min(exit, Math.max(firstEdge, secondEdge));
        if (enter > exit) intersects = false;
      }
      if (!intersects) break;
    }
    if (intersects) return true;
  }
  return false;
}

function getPublicSearchSuggestions(
  results: readonly PublicSearchResult[],
  coordinate: GeoCoordinate | null,
  filters: SearchFilters = {},
  query = "",
): readonly SearchSuggestionItem[] {
  return results
    .filter(
      (result) =>
        (!filters.kind || result.kind === filters.kind) &&
        (!filters.bounds || isInsideSearchBounds(result, filters.bounds)),
    )
    .map((result) => ({
      key:
        result.kind === "center" && result.centerCode
          ? `center:${result.centerCode}`
          : placeKey(result.kind, result.title, result),
      title: result.title,
      subtitle: result.subtitle,
      kind: result.kind,
      relevance:
        result.relevance ??
        getSearchRelevance(query, result.title, result.subtitle),
      distanceMeters: coordinate
        ? (result.distanceMeters ?? getDistanceMeters(coordinate, result))
        : null,
      result,
    }));
}

/** Local search cannot escape the downloaded manifests or call a remote API. */
export function getOfflineSearchSuggestions(
  manifests: readonly OfflineCityManifest[],
  query: string,
  coordinate: GeoCoordinate | null,
  filters: SearchFilters = {},
): readonly SearchSuggestionItem[] {
  if (normalizeSearchText(query).length < 2) return [];
  return manifests.flatMap((manifest) =>
    getOfflineBrowserItems(manifest).flatMap((item) => {
      const kind =
        item.kind === "route"
          ? "route"
          : item.center
            ? "center"
            : item.key.startsWith("establishment:")
              ? "establishment"
              : "poi";
      if (
        filters.kind &&
        filters.kind !== kind &&
        !(filters.kind === "geographic" && (kind === "poi" || kind === "route"))
      )
        return [];
      const extra =
        item.kind === "place"
          ? `${item.description ?? ""} ${item.address ?? ""}`
          : "";
      const relevance = getSearchRelevance(
        query,
        item.name,
        item.subtitle,
        extra,
      );
      if (!relevance) return [];
      const itemCoordinate =
        item.kind === "place"
          ? item.coordinate
          : item.route.geometry.coordinates[0]?.length === 2
            ? {
                longitude: item.route.geometry.coordinates[0]![0]!,
                latitude: item.route.geometry.coordinates[0]![1]!,
              }
            : null;
      const inArea =
        !filters.bounds ||
        (item.kind === "place"
          ? isInsideSearchBounds(item.coordinate, filters.bounds)
          : routeIntersectsBounds(
              item.route.geometry.coordinates,
              filters.bounds,
            ));
      if (!inArea) return [];
      return [
        {
          key:
            kind === "center" || kind === "route"
              ? item.key
              : itemCoordinate
                ? placeKey(kind, item.name, itemCoordinate)
                : `${manifest.city.slug}:${item.key}`,
          title: item.name,
          subtitle: `${item.subtitle} · ${manifest.city.name}`,
          kind,
          relevance,
          distanceMeters:
            coordinate && itemCoordinate
              ? getDistanceMeters(coordinate, itemCoordinate)
              : null,
          offline: {
            slug: manifest.city.slug,
            itemKey: item.key,
            cityName: manifest.city.name,
          },
        },
      ];
    }),
  );
}

export function getOfflineSearchCoverage(
  manifests: readonly OfflineCityManifest[],
  filters: SearchFilters = {},
): readonly OfflineSearchCoverage[] {
  return manifests
    .filter((manifest) => {
      if (!filters.bounds) return true;
      const bounds = manifest.download?.bounds ?? manifest.bounds;
      if (bounds)
        return (
          bounds[0] <= filters.bounds[2] &&
          bounds[2] >= filters.bounds[0] &&
          bounds[1] <= filters.bounds[3] &&
          bounds[3] >= filters.bounds[1]
        );
      return getOfflineBrowserItems(manifest).some(
        (item) =>
          item.kind === "place" &&
          isInsideSearchBounds(item.coordinate, filters.bounds!),
      );
    })
    .map(({ city }) => ({ slug: city.slug, name: city.name }));
}

/** Remote errors/paused queries use downloaded coverage, never a global cache. */
export function buildSearchSuggestions({
  query,
  manifests,
  onlineResults,
  coordinate,
  filters = {},
  onlineUnavailable,
}: Readonly<{
  query: string;
  manifests: readonly OfflineCityManifest[];
  onlineResults: readonly PublicSearchResult[];
  coordinate: GeoCoordinate | null;
  filters?: SearchFilters;
  onlineUnavailable: boolean;
}>) {
  const local = getOfflineSearchSuggestions(
    manifests,
    query,
    coordinate,
    filters,
  );
  const online =
    onlineUnavailable || normalizeSearchText(query).length < 2
      ? []
      : getPublicSearchSuggestions(onlineResults, coordinate, filters, query);
  return {
    searchItems: rankSearchSuggestions(
      deduplicateSearchSuggestions([...online, ...local]),
      query,
    ),
    offlineCoverage: getOfflineSearchCoverage(manifests, filters),
  };
}
