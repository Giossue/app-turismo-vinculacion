import { useState } from "react";

import type { CalculatedRoute } from "../domain/routing";

/**
 * Route shown on screen. While navigating, a failed recalculation leaves the
 * query without data; the route being followed (and the overlay with its
 * close control) must not disappear, so the last calculated one is kept
 * until a new route arrives.
 */
export function useNavigationRoute(
  calculatedRoute: CalculatedRoute | null,
  navigationActive: boolean,
): CalculatedRoute | null {
  const [followedRoute, setFollowedRoute] = useState(calculatedRoute);
  if (
    navigationActive &&
    calculatedRoute &&
    calculatedRoute !== followedRoute
  ) {
    setFollowedRoute(calculatedRoute);
  }
  return navigationActive
    ? (calculatedRoute ?? followedRoute)
    : calculatedRoute;
}
