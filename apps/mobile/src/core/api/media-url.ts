import { getApiUrl } from "./api-url";

/**
 * Media paths are served by the API host outside `/api/v1`; absolute URLs are
 * returned unchanged.
 */
export function resolveMediaUrl(path: string, apiUrl = getApiUrl()): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${apiUrl.replace(/\/api\/v1$/, "")}${path}`;
}
