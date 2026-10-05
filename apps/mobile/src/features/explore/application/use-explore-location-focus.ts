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
  // The "my location" button forces a refresh, which clears the coordinate
  // and passes through `requesting`; a position turning ready again is the
  // only trigger that moves the camera. Returning to the foreground keeps the
  // coordinate (the watcher just resumes), so the camera does not jump then.
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
