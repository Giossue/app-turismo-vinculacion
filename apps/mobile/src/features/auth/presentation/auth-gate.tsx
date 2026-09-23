import { Redirect, useRouter } from "expo-router";
import type { ReactNode } from "react";

import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import type { LoginReturnPath } from "../application/login-href";
import { useRequireAuth } from "../application/use-require-auth";
import type { AuthUser } from "../domain/auth-user";

/**
 * Secondary screen that requires a tourist account. It renders the shared
 * `TourismScreenFrame` and, inside it, a loading state while the session is
 * restored, a declarative redirect to the login (which returns to
 * `returnTo`) for anonymous visitors, or `children` with the signed-in user.
 * Logging out from inside the screen therefore navigates exactly once.
 */
export function AuthGate({
  children,
  loadingMessage = "Preparando tu cuenta turística…",
  returnTo,
  title,
}: Readonly<{
  children: (user: AuthUser) => ReactNode;
  loadingMessage?: string;
  returnTo: LoginReturnPath;
  title: string;
}>) {
  const router = useRouter();
  const access = useRequireAuth(returnTo);

  return (
    <TourismScreenFrame onBack={() => router.back()} title={title}>
      {access.status === "authenticated" ? (
        children(access.user)
      ) : (
        <>
          {access.status === "redirect" ? (
            <Redirect href={access.loginHref} />
          ) : null}
          <TourismStateView message={loadingMessage} variant="loading" />
        </>
      )}
    </TourismScreenFrame>
  );
}
