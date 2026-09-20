import * as SecureStore from "expo-secure-store";

const refreshTokenKey = "turismo-vinculacion-mobile-refresh-token";

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(refreshTokenKey);
}

export function saveRefreshToken(value: string): Promise<void> {
  return SecureStore.setItemAsync(refreshTokenKey, value);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(refreshTokenKey);
}
