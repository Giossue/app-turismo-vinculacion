// Android emulators reach the host machine through 10.0.2.2.
const developmentApiUrl = "http://10.0.2.2:3000/api/v1";

export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof __DEV__ !== "undefined" && __DEV__) return developmentApiUrl;
  throw new Error(
    "EXPO_PUBLIC_API_URL no está configurada para esta compilación.",
  );
}
