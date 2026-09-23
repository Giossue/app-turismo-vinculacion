import type { LocationObject } from "expo-location";

import type { GeoCoordinate } from "../geo/types";

/** Reads the WGS84 point of an `expo-location` reading. */
export function toCoordinate(
  location: Pick<LocationObject, "coords">,
): GeoCoordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
