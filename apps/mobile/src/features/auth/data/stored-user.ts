import { authUserSchema, type AuthUser } from "../domain/auth-user";

/**
 * The signed-in tourist's public profile is kept next to the refresh token
 * so an offline start can restore the session without the API. It is only a
 * display copy: every request still needs a refreshed access token.
 */
export type StoredSession = Readonly<{
  refreshToken: string;
  user: AuthUser | null;
}>;

export function serializeStoredUser(user: AuthUser): string {
  return JSON.stringify(user);
}

export function parseStoredUser(value: string | null): AuthUser | null {
  if (!value) return null;
  try {
    const parsed = authUserSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
