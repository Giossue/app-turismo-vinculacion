import * as SecureStore from "expo-secure-store";

import type { AuthUser } from "../domain/auth-user";
import {
  parseStoredUser,
  serializeStoredUser,
  type StoredSession,
} from "./stored-user";

const refreshTokenKey = "turismo-vinculacion-mobile-refresh-token";
const userKey = "turismo-vinculacion-mobile-session-user";

export async function readStoredSession(): Promise<StoredSession | null> {
  const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);
  if (!refreshToken) return null;
  const user = parseStoredUser(await SecureStore.getItemAsync(userKey));
  return { refreshToken, user };
}

export async function saveStoredSession(
  refreshToken: string,
  user: AuthUser,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(refreshTokenKey, refreshToken),
    SecureStore.setItemAsync(userKey, serializeStoredUser(user)),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(refreshTokenKey),
    SecureStore.deleteItemAsync(userKey),
  ]);
}
