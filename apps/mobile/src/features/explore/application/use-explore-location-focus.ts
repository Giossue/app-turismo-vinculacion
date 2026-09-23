import { useState } from "react";

import { useUserLocation } from "@/core/location/use-user-location";

/**
 * GPS session for Explore. The location is only requested when the tourist
 * taps "my location" (never when the screen opens); each fresh position
 * recenters the map, and the hook tracks whether the camera still rests on it
 * (to show the locate button).
 */
export function useExploreLocationFocus() {
  const { coordinate, requestLocation, status } = useUserLocation();
  const [confirmedFocusKey, setConfirmedFocusKey] = useState<number | null>(
    null,
  );
  const hasFreshLocation = status === "ready" && coordinate !== null;
  // Every request (button or return to foreground) passes through
  // `requesting`, so a position turning ready is the only trigger that
  // moves the camera to the user; the button does not recenter again.
  const [locationFocus, setLocationFocus] = useState({ fresh: false, key: 0 });
  if (locationFocus.fresh !== hasFreshLocation) {
    setLocationFocus({
      fresh: hasFreshLocation,
      key: hasFreshLocation ? locationFocus.key + 1 : locationFocus.key,
    });
  }
  const focusLocationKey = locationFocus.key;

  const locationFocused =
    status === "ready" && confirmedFocusKey === focusLocationKey;

  return {
    focusLocationKey,
    requestLocation: () => void requestLocation({ forceRefresh: true }),
    status,
    userLocation: coordinate,
    /** The camera left the user's position (pan, zoom or another focus). */
    clearLocationFocus: () => setConfirmedFocusKey(null),
    locate: () => {
      setConfirmedFocusKey(null);
      void requestLocation({ forceRefresh: true });
    },
    onLocationFocusChange: (focused: boolean) =>
      setConfirmedFocusKey(focused ? focusLocationKey : null),
    showLocateAction: !locationFocused,
    locateLabel:
      status === "ready"
        ? "Volver a centrar el mapa en mi ubicación"
        : status === "requesting"
          ? "Obteniendo tu ubicación"
          : "Activar ubicación",
  };
}
