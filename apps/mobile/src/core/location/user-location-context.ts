import { createContext, useContext } from "react";

import type { GeoCoordinate } from "../geo/types";
import type {
  UserLocationState,
  UserLocationStatus,
} from "./location-session-helpers";

/** Status and message only; it does not change with each GPS sample. */
export type UserLocationStatusValue = Readonly<{
  message: string | null;
  status: UserLocationStatus;
}>;

export type UserLocationActions = Readonly<{
  requestLocation: (
    options?: Readonly<{ forceRefresh?: boolean }>,
  ) => Promise<GeoCoordinate | null>;
  setForegroundTrackingSuspended: (suspended: boolean) => void;
}>;

export type UserLocationContextValue = UserLocationState & UserLocationActions;

// Three contexts so a consumer that only needs the actions or the status is
// not re-rendered by every coordinate sample.
export const UserLocationStateContext = createContext<UserLocationState | null>(
  null,
);
export const UserLocationStatusContext =
  createContext<UserLocationStatusValue | null>(null);
export const UserLocationActionsContext =
  createContext<UserLocationActions | null>(null);

/**
 * Full session: coordinate, accuracy, status and actions. Re-renders on every
 * GPS sample; prefer `useUserLocationActions` or `useUserLocationStatus`
 * when the coordinate is not needed.
 */
export function useUserLocation(): UserLocationContextValue {
  const state = useContext(UserLocationStateContext);
  const actions = useContext(UserLocationActionsContext);
  if (!state || !actions) {
    throw new Error(
      "useUserLocation debe usarse dentro de UserLocationProvider.",
    );
  }
  return { ...state, ...actions };
}

/** Stable actions only; never re-renders because of location updates. */
export function useUserLocationActions(): UserLocationActions {
  const actions = useContext(UserLocationActionsContext);
  if (!actions) {
    throw new Error(
      "useUserLocationActions debe usarse dentro de UserLocationProvider.",
    );
  }
  return actions;
}

/** Status and message; re-renders only when they change, not per sample. */
export function useUserLocationStatus(): UserLocationStatusValue {
  const status = useContext(UserLocationStatusContext);
  if (!status) {
    throw new Error(
      "useUserLocationStatus debe usarse dentro de UserLocationProvider.",
    );
  }
  return status;
}
