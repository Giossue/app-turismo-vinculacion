import { getApiUrl } from "./api-url";

/**
 * Media paths are served by the API host outside `/api/v1`; absolute URLs are
 * returned unchanged.
 */
export function resolveMediaUrl(path: string, apiUrl = getApiUrl()): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${apiUrl.replace(/\/api\/v1$/, "")}${path}`;
}

export type MediaImageSize = "thumbnail" | "preview";

/** Solo las fotografías de nuestra API reciben una variante; enlaces externos se conservan. */
export function resolveMediaVariantUrl(
  path: string,
  size: MediaImageSize,
  apiUrl = getApiUrl(),
): string {
  const original = resolveMediaUrl(path, apiUrl);
  try {
    const url = new URL(original);
    if (
      url.origin !== new URL(apiUrl).origin ||
      !/^\/api\/v1\/media\/(?:establishments\/)?[1-9][0-9]*$/.test(url.pathname)
    )
      return original;
    url.searchParams.set("size", size);
    return url.toString();
  } catch {
    return original;
  }
}
