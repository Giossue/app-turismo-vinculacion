import type { GeoCoordinate } from "../geo/types";
import {
  locationUnavailableMessages,
  type LocationUnavailableReason,
} from "./location-availability";

export type UserLocationStatus =
  "idle" | "requesting" | "ready" | "denied" | "disabled" | "error";

export type UserLocationState = Readonly<{
  accuracy: number | null;
  coordinate: GeoCoordinate | null;
  message: string | null;
  status: UserLocationStatus;
}>;

export function toUnavailableState(
  current: UserLocationState,
  reason: LocationUnavailableReason,
): UserLocationState {
  return {
    ...current,
    coordinate: null,
    message: locationUnavailableMessages[reason],
    status: reason === "services-disabled" ? "disabled" : "denied",
  };
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Location request timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
