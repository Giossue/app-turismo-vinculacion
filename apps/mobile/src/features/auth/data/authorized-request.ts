import { ApiError } from "@/core/api/http";

export function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * True only for URLs under the configured API: the tourist's access token
 * must never be sent to another origin (tiles, media hosts, providers).
 */
export function isApiRequest(
  input: RequestInfo | URL,
  apiUrl: string | null,
): boolean {
  if (!apiUrl) return false;
  const url = getRequestUrl(input);
  return (
    url === apiUrl ||
    url.startsWith(`${apiUrl}/`) ||
    url.startsWith(`${apiUrl}?`)
  );
}

/**
 * The API refused the refresh token (invalid, expired, revoked or
 * malformed). Network failures and 5xx responses are not rejections: the
 * stored session must survive them.
 */
export function isRejectedSessionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  );
}
