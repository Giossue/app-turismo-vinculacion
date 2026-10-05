import { describe, expect, it } from "vitest";

import { resolveBackgroundTracking } from "./background-tracking";
import { navigationMessages } from "./navigation-session-state";

describe("resolveBackgroundTracking", () => {
  it("never enables nor warns when the opt-in is off", () => {
    expect(resolveBackgroundTracking(false, null)).toEqual({
      enabled: false,
      notice: null,
    });
    expect(
      resolveBackgroundTracking(false, {
        location: false,
        notifications: false,
      }),
    ).toEqual({ enabled: false, notice: null });
  });

  it("enables background tracking when every permission is granted", () => {
    expect(
      resolveBackgroundTracking(true, { location: true, notifications: true }),
    ).toEqual({ enabled: true, notice: null });
  });

  it("explains a refused background location permission", () => {
    expect(
      resolveBackgroundTracking(true, { location: false, notifications: true }),
    ).toEqual({
      enabled: false,
      notice: navigationMessages.backgroundPermissionDenied,
    });
  });

  it("explains a refused notification permission", () => {
    expect(
      resolveBackgroundTracking(true, { location: true, notifications: false }),
    ).toEqual({
      enabled: false,
      notice: navigationMessages.backgroundNotificationDenied,
    });
  });

  it("falls back to the generic notice when the prompts failed", () => {
    expect(resolveBackgroundTracking(true, null)).toEqual({
      enabled: false,
      notice: navigationMessages.backgroundUnavailable,
    });
  });
});
