/**
 * Decides when an authorized request must refresh the session before (and
 * retry after) hitting the API. Pure so the policy can be tested without the
 * provider.
 *
 * - A restored-offline session has no access token yet: refresh first.
 * - A tourist already known to be anonymous has nothing to refresh; the
 *   request is sent without a token and a secure-store read is saved.
 * - A 401 is retried only when a token was actually sent: with no token the
 *   refusal is expected and a second refresh would be wasted work.
 */
export function shouldRefreshBeforeRequest(
  input: Readonly<{ hasAccessToken: boolean; knownAnonymous: boolean }>,
): boolean {
  return !input.hasAccessToken && !input.knownAnonymous;
}

export function shouldRetryAfterUnauthorized(
  input: Readonly<{ sentAccessToken: boolean }>,
): boolean {
  return input.sentAccessToken;
}
