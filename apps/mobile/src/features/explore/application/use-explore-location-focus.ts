import { useEffect, useState } from "react";

import { useUserLocation } from "@/core/location/use-user-location";

/**
 * GPS session for Explore: asks for the location when the screen opens,
 * recenters the map each time a fresh position becomes ready, and tracks
 * whether the camera still rests on it (to show the locate button).
 */
export function useExploreLocationFocus() {
  const { coordinate, requestLocation, status } = useUserLocation();
  const [focusLocationKey, setFocusLocationKey] = useState(0);
  const [confirmedFocusKey, setConfirmedFocusKey] = useState<number | null>(
    null,
  );
  const hasFreshLocation = status === "ready" && coordinate !== null;

  useEffect(() => {
    if (status === "idle") void requestLocation({ forceRefresh: true });
  }, [requestLocation, status]);

  // Every request (initial, button, return to foreground) passes through
  // `requesting`, so this is the only place that moves the camera to the
  // user; the button does not need to recenter again after its request.
  useEffect(() => {
    if (hasFreshLocation) setFocusLocationKey((key) => key + 1);
  }, [hasFreshLocation]);

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
