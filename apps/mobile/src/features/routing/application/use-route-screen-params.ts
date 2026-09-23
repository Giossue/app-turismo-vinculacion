import { useLocalSearchParams } from "expo-router";

import {
  parseRouteSearchParams,
  type ParsedRouteSearchParams,
  type RouteSearchParams,
} from "../presentation/route-href";

/**
 * Destination and initial mode of the route screen. `destination` is `null`
 * when the link lacks valid coordinates.
 */
export function useRouteScreenParams(): ParsedRouteSearchParams {
  const { destinationLatitude, destinationLongitude, destinationName, mode } =
    useLocalSearchParams<RouteSearchParams>();
  // React Compiler memoizes the result on these four values, so the
  // destination keeps its identity across renders.
  return parseRouteSearchParams({
    destinationLatitude,
    destinationLongitude,
    destinationName,
    mode,
  });
}
