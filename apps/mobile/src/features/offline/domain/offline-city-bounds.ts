import { getCoordinateBounds } from "@/core/geo/bounds";
import type { GeoBoundingBox } from "@/core/geo/types";
import type { OfflineCityManifest } from "./offline-city";

const fallbackCityRadiusDegrees = 0.12;

/** Older manifests may lack bounds; only real city coordinates can supply them. */
export function getOfflineCityBounds(
  manifest: OfflineCityManifest,
): GeoBoundingBox {
  if (manifest.bounds) return manifest.bounds;
  const boundaryBounds = getCoordinateBounds(
    iterateGeometry(manifest.boundary),
  );
  if (
    boundaryBounds &&
    boundaryBounds[0] < boundaryBounds[2] &&
    boundaryBounds[1] < boundaryBounds[3]
  ) {
    return boundaryBounds;
  }
  const { longitude, latitude } = manifest.city;
  if (longitude === null || latitude === null) {
    throw new Error(
      "La ciudad no tiene límites disponibles para descargar el mapa.",
    );
  }
  return [
    Math.max(-180, longitude - fallbackCityRadiusDegrees),
    Math.max(-85, latitude - fallbackCityRadiusDegrees),
    Math.min(180, longitude + fallbackCityRadiusDegrees),
    Math.min(85, latitude + fallbackCityRadiusDegrees),
  ];
}

function* iterateGeometry(
  value: unknown,
): Generator<readonly [number, number]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const geometry = value as Record<string, unknown>;
  if (geometry.type === "Feature") yield* iterateGeometry(geometry.geometry);
  else if (
    geometry.type === "FeatureCollection" &&
    Array.isArray(geometry.features)
  ) {
    for (const feature of geometry.features) yield* iterateGeometry(feature);
  } else if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    for (const child of geometry.geometries) yield* iterateGeometry(child);
  } else yield* iterateCoordinates(geometry.coordinates);
}

function* iterateCoordinates(
  value: unknown,
): Generator<readonly [number, number]> {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && value.every((item) => typeof item === "number")) {
    const [longitude, latitude] = value as number[];
    if (
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      Math.abs(longitude) <= 180 &&
      Math.abs(latitude) <= 90
    ) {
      yield [longitude, latitude];
    }
    return;
  }
  for (const child of value) yield* iterateCoordinates(child);
}
