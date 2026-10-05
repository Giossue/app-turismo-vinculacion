import { describe, expect, it } from "vitest";

import {
  shouldRefreshBeforeRequest,
  shouldRetryAfterUnauthorized,
} from "./authorized-request-policy";

describe("authorized request policy", () => {
  it("refreshes only when a token is missing and the tourist may have a session", () => {
    expect(
      shouldRefreshBeforeRequest({
        hasAccessToken: false,
        knownAnonymous: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshBeforeRequest({
        hasAccessToken: false,
        knownAnonymous: true,
      }),
    ).toBe(false);
    expect(
      shouldRefreshBeforeRequest({
        hasAccessToken: true,
        knownAnonymous: false,
      }),
    ).toBe(false);
  });

  it("retries a 401 only when a token was sent", () => {
    expect(shouldRetryAfterUnauthorized({ sentAccessToken: true })).toBe(true);
    expect(shouldRetryAfterUnauthorized({ sentAccessToken: false })).toBe(
      false,
    );
  });
});
