import { AccessibilityInfo } from "react-native";

import { useTrip } from "../application/use-trip";
import { maxTripStops, type TripStop } from "../domain/trip";
import { messages } from "@/core/i18n/language";

export type TripControl = Readonly<{
  accessibilityLabel: string;
  /** El recorrido está lleno y este lugar no está en él. */
  disabled: boolean;
  inTrip: boolean;
  toggle: () => void;
}>;

/**
 * «Agregar al recorrido» de una ficha. Sin lugar (o sin coordenadas) no hay
 * control. Un recorrido lleno deja el control deshabilitado y lo explica.
 */
export function useTripToggle(stop: TripStop | null): TripControl | null {
  const trip = useTrip();
  if (!stop) return null;
  const text = messages().routing.trip;
  const inTrip = trip.stops.some((item) => item.key === stop.key);
  const full = !inTrip && trip.stops.length >= maxTripStops;
  return {
    accessibilityLabel: inTrip
      ? text.remove(stop.name)
      : full
        ? text.full(maxTripStops)
        : text.add(stop.name),
    disabled: full,
    inTrip,
    toggle: () => {
      if (inTrip) {
        trip.remove(stop.key);
        AccessibilityInfo.announceForAccessibility(text.removed(stop.name));
      } else if (trip.add(stop) === "added") {
        AccessibilityInfo.announceForAccessibility(text.added(stop.name));
      }
    },
  };
}
