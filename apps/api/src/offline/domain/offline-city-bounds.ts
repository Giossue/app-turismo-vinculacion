import {
  OfflineCityAreaUnavailableError,
  type OfflineCity,
  type OfflineCityManifest,
  type OfflineGeoJson,
} from "./offline-city";

const fallbackCityRadiusDegrees = 0.12;

/** The API and the downloaded tiles must cover the same geographic area. */
export function getOfflineCityBounds(
  boundary: OfflineGeoJson | null,
  city: Pick<OfflineCity, "latitude" | "longitude">,
): OfflineCityManifest["bounds"] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of coordinates(boundary?.coordinates)) {
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  }
  if (west < east && south < north) return [west, south, east, north];

  const { latitude, longitude } = city;
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new OfflineCityAreaUnavailableError();
  }
  return [
    Math.max(-180, longitude - fallbackCityRadiusDegrees),
    Math.max(-90, latitude - fallbackCityRadiusDegrees),
    Math.min(180, longitude + fallbackCityRadiusDegrees),
    Math.min(90, latitude + fallbackCityRadiusDegrees),
  ];
}

function* coordinates(value: unknown): Generator<readonly [number, number]> {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    if (
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1]) &&
      Math.abs(value[0]) <= 180 &&
      Math.abs(value[1]) <= 90
    ) {
      yield [value[0], value[1]];
    }
    return;
  }
  for (const child of value) yield* coordinates(child);
}
