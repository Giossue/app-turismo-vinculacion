import type { Href } from "expo-router";

import {
  firstSearchParam,
  type SearchParamValue,
} from "@/core/navigation/search-params";

/** Internal path the login screen returns to, e.g. `/saved` or `/centers/X`. */
export type LoginReturnPath = Extract<Href, string>;

/** Opens the account entry and comes back to `returnTo` after signing in. */
export function buildLoginHref(returnTo: LoginReturnPath): Href {
  return { pathname: "/login", params: { returnTo } };
}

/**
 * Accepts only absolute in-app paths so a crafted link cannot send the user
 * to another origin or loop back into the login screen. Defaults to `/`.
 */
export function parseReturnTo(param: SearchParamValue): LoginReturnPath {
  const candidate = firstSearchParam(param);
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/login")
  ) {
    return "/";
  }
  // Validated above as an internal absolute path.
  return candidate as LoginReturnPath;
}

/**
 * Targets whose screen keeps its state in params that `returnTo` does not
 * carry (the route keeps its destination). Returning to them must go back to
 * the same history entry; `dismissTo` would reset those params.
 */
export function returnsThroughHistory(target: LoginReturnPath): boolean {
  return target === "/route";
}
