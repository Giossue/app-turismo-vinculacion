import { navigationMessages } from "./navigation-session-state";

/** Result of asking the system for the background opt-in permissions. */
export type BackgroundTrackingPermissions = Readonly<{
  /** Background location granted (and available on this platform). */
  location: boolean;
  /** Android 13+ notification permission for the foreground service. */
  notifications: boolean;
}>;

export type BackgroundTrackingOutcome = Readonly<{
  /** Whether the persistent task may be started with this navigation. */
  enabled: boolean;
  /** Visible explanation when the opt-in is on but cannot be honoured. */
  notice: string | null;
}>;

/**
 * Decides whether a navigation runs with background tracking. Pure, so the
 * screen only orchestrates the permission prompts: the opt-in off never asks
 * nor warns; the opt-in on without every permission keeps the navigation in
 * the foreground and says so, never silently.
 */
export function resolveBackgroundTracking(
  optedIn: boolean,
  permissions: BackgroundTrackingPermissions | null,
): BackgroundTrackingOutcome {
  if (!optedIn) return { enabled: false, notice: null };
  if (!permissions) {
    return { enabled: false, notice: navigationMessages.backgroundUnavailable };
  }
  if (!permissions.location) {
    return {
      enabled: false,
      notice: navigationMessages.backgroundPermissionDenied,
    };
  }
  if (!permissions.notifications) {
    return {
      enabled: false,
      notice: navigationMessages.backgroundNotificationDenied,
    };
  }
  return { enabled: true, notice: null };
}
