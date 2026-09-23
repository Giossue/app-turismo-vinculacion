import type { Href } from "expo-router";

import type { AuthUser } from "../domain/auth-user";
import { useAuth } from "./auth-context";
import { buildLoginHref, type LoginReturnPath } from "./login-href";

export type RequiredAuth =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "redirect"; loginHref: Href }>
  | Readonly<{ status: "authenticated"; user: AuthUser }>;

/**
 * Access state of a screen that needs a tourist account. `redirect` carries
 * the login href that brings the tourist back to `returnTo`; while the
 * session is being restored the screen stays `loading`.
 */
export function useRequireAuth(returnTo: LoginReturnPath): RequiredAuth {
  const { status, user } = useAuth();
  if (status === "anonymous") {
    return { loginHref: buildLoginHref(returnTo), status: "redirect" };
  }
  if (status === "authenticated" && user) {
    return { status: "authenticated", user };
  }
  return { status: "loading" };
}
