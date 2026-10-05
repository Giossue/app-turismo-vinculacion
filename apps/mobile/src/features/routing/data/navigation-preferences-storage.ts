import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";

const navigationPreferencesStorageKey =
  "turismo-vinculacion-navigation-preferences-v1";

/**
 * Choices the tourist makes in the route preview and expects to find again.
 * `backgroundTracking` is the explicit opt-in that allows asking for the
 * background location and notification permissions when a navigation starts
 * (see `AGENTS.md`); it is off until the person enables it.
 */
export type NavigationPreferences = Readonly<{
  backgroundTracking: boolean;
  version: 1;
}>;

export const defaultNavigationPreferences: NavigationPreferences = {
  backgroundTracking: false,
  version: 1,
};

const navigationPreferencesSchema = z.object({
  backgroundTracking: z.boolean(),
  version: z.literal(1),
});

/** Missing or invalid entries fall back to the defaults (opt-in stays off). */
export async function readNavigationPreferences(): Promise<NavigationPreferences> {
  const stored = await readJson(
    navigationPreferencesStorageKey,
    navigationPreferencesSchema,
  );
  return stored ?? defaultNavigationPreferences;
}

/** Resolves `false` instead of rejecting when the device cannot store it. */
export async function saveNavigationPreferences(
  preferences: NavigationPreferences,
): Promise<boolean> {
  try {
    await writeJson(navigationPreferencesStorageKey, preferences);
    return true;
  } catch {
    return false;
  }
}

/** Persists only the background opt-in, keeping the other preferences. */
export async function setBackgroundTrackingPreference(
  enabled: boolean,
): Promise<boolean> {
  const current = await readNavigationPreferences();
  if (current.backgroundTracking === enabled) return true;
  return saveNavigationPreferences({ ...current, backgroundTracking: enabled });
}
