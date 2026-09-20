let refreshToken: string | null = null;

export async function readRefreshToken(): Promise<string | null> {
  return refreshToken;
}

export async function saveRefreshToken(value: string): Promise<void> {
  refreshToken = value;
}

export async function clearRefreshToken(): Promise<void> {
  refreshToken = null;
}
