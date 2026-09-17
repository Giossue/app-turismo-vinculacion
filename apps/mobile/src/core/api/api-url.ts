const fallbackApiUrl = "http://10.0.2.2:3000/api/v1";

export function getApiUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl).replace(/\/$/, "");
}
