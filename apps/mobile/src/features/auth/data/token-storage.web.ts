import type { AuthUser } from "../domain/auth-user";
import type { StoredSession } from "./stored-user";

// La vista web de desarrollo mantiene la sesión solo en memoria.
let session: StoredSession | null = null;

export async function readStoredSession(): Promise<StoredSession | null> {
  return session;
}

export async function saveStoredSession(
  refreshToken: string,
  user: AuthUser,
): Promise<void> {
  session = { refreshToken, user };
}

export async function clearStoredSession(): Promise<void> {
  session = null;
}
