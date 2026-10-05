import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  getCenterHierarchyRank,
  getCenterMapPriority,
} from "../domain/map-place-priority";
import {
  getMapFeatureCoordinate,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";
import type { LocalMapPlace, MapPlaceMarker } from "./center-map.types";

export type CenterFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Readonly<{
    code: string;
    name: string;
    hierarchyRank: number;
    priority: number;
  }>
>;
export type PointFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point>;

/** Centers by code, including the selected one even if it left the list. */
export function buildCentersByCode(
  centers: readonly PublicCenter[],
  selectedFeature: MapFeatureSelection | null,
): ReadonlyMap<string, PublicCenter> {
  return new Map(
    [
      ...centers,
      ...(selectedFeature?.kind === "center" ? [selectedFeature.center] : []),
    ].map((center) => [center.code, center]),
  );
}

/** General center pins; the selected center is drawn by its own source. */
export function buildCenterFeatures(
  centers: readonly PublicCenter[],
  selectedFeature: MapFeatureSelection | null,
  viewportCenter: GeoCoordinate,
): CenterFeatureCollection {
  return {
    type: "FeatureCollection",
    features: centers
      .filter(
        (center) =>
          selectedFeature?.kind !== "center" ||
          center.code !== selectedFeature.center.code,
      )
      .map((center) => ({
        type: "Feature",
        id: center.code,
        properties: {
          code: center.code,
          name: center.name,
          hierarchyRank: getCenterHierarchyRank(center),
          priority: getCenterMapPriority(center, viewportCenter),
        },
        geometry: {
          type: "Point",
          coordinates: [center.longitude, center.latitude],
        },
      })),
  };
}

export function buildLocalFeatures(
  localPlaces: readonly LocalMapPlace[] | undefined,
): PointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: (localPlaces ?? []).map((place) => ({
      type: "Feature",
      id: place.key,
      properties: {
        offlineKey: place.key,
        icon: place.icon,
        name: place.name,
      },
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude],
      },
    })),
  };
}

export function buildSelectedFeatures(
  selectedFeature: MapFeatureSelection | null,
): PointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: selectedFeature
      ? [
          {
            type: "Feature",
            properties:
              selectedFeature.kind === "center"
                ? {
                    code: selectedFeature.center.code,
                    name: selectedFeature.center.name,
                    isCenter: true,
                  }
                : { ...selectedFeature.establishment, isCenter: false },
            geometry: {
              type: "Point",
              coordinates: getMapFeatureCoordinate(selectedFeature),
            },
          },
        ]
      : [],
  };
}

export function buildLocalRouteFeature(
  localRoute: GeoJSON.LineString | null | undefined,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: localRoute
      ? [{ type: "Feature", geometry: localRoute, properties: {} }]
      : [],
  };
}

/** Punto único con el nombre del lugar geográfico buscado. */
export function buildPlaceMarkerFeatures(
  marker: MapPlaceMarker | null,
): PointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: marker
      ? [
          {
            type: "Feature",
            properties: { name: marker.title },
            geometry: {
              type: "Point",
              coordinates: [
                marker.coordinate.longitude,
                marker.coordinate.latitude,
              ],
            },
          },
        ]
      : [],
  };
}
