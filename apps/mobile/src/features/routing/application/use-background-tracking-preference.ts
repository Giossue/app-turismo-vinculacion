import { useEffect, useState } from "react";

import {
  readNavigationPreferences,
  setBackgroundTrackingPreference,
} from "../data/navigation-preferences-storage";
import {
  resolveBackgroundTracking,
  type BackgroundTrackingOutcome,
  type BackgroundTrackingPermissions,
} from "../domain/background-tracking";
import {
  requestNavigationBackgroundPermission,
  requestNavigationNotificationPermission,
} from "../infrastructure/navigation-background-task";

/**
 * The persisted «Seguir en segundo plano» opt-in and the notice explaining
 * why the last start could not honour it. `request` asks the system only
 * when the opt-in is on; a refusal is reported, never silent.
 */
export function useBackgroundTrackingPreference(): Readonly<{
  notice: string | null;
  optedIn: boolean;
  request: (isCancelled: () => boolean) => Promise<BackgroundTrackingOutcome>;
  setOptedIn: (enabled: boolean) => void;
}> {
  const [optedIn, setOptedInState] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readNavigationPreferences().then((preferences) => {
      if (!cancelled) setOptedInState(preferences.backgroundTracking);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setOptedIn = (enabled: boolean) => {
    setOptedInState(enabled);
    setNotice(null);
    void setBackgroundTrackingPreference(enabled);
  };

  const request = async (
    isCancelled: () => boolean,
  ): Promise<BackgroundTrackingOutcome> => {
    const cancelledOutcome: BackgroundTrackingOutcome = {
      enabled: false,
      notice: null,
    };
    if (!optedIn) {
      setNotice(null);
      return cancelledOutcome;
    }
    let permissions: BackgroundTrackingPermissions | null = null;
    try {
      const location = (await requestNavigationBackgroundPermission()).granted;
      if (isCancelled()) return cancelledOutcome;
      // Without background location the notification is pointless.
      const notifications = location
        ? await requestNavigationNotificationPermission()
        : false;
      if (isCancelled()) return cancelledOutcome;
      permissions = { location, notifications };
    } catch {
      permissions = null;
    }
    const outcome = resolveBackgroundTracking(true, permissions);
    setNotice(outcome.notice);
    return outcome;
  };

  return { notice, optedIn, request, setOptedIn };
}
