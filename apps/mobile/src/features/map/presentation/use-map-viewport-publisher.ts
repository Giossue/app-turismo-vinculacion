import type { MapRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useRef, type RefObject } from "react";

import type { CenterMapViewport } from "./center-map.types";
import { isSameMapViewport, parseMapViewport } from "./map-viewport";

/**
 * Reports the visible area once the map is ready and after every camera move,
 * skipping duplicates. `beginRegionChange`/`completeRegionChange` wrap the
 * native region events so a gesture invalidates a pending initial snapshot.
 */
export function useMapViewportPublisher({
  isActive,
  mapRef,
  nativeReady,
  onViewportChange,
}: Readonly<{
  isActive: () => boolean;
  mapRef: RefObject<MapRef | null>;
  nativeReady: boolean;
  onViewportChange: ((viewport: CenterMapViewport) => void) | undefined;
}>) {
  const callbackRef = useRef(onViewportChange);
  const requestKeyRef = useRef(0);
  const movingRef = useRef(false);
  const lastViewportRef = useRef<CenterMapViewport | null>(null);
  useEffect(() => {
    callbackRef.current = onViewportChange;
  }, [onViewportChange]);

  const publishViewport = useCallback(
    (center: unknown, bounds: unknown) => {
      if (!isActive() || !callbackRef.current) return;
      const viewport = parseMapViewport(center, bounds);
      if (!viewport || isSameMapViewport(lastViewportRef.current, viewport))
        return;
      lastViewportRef.current = viewport;
      callbackRef.current(viewport);
    },
    [isActive],
  );

  const hasViewportListener = onViewportChange !== undefined;
  useEffect(() => {
    if (!nativeReady || !hasViewportListener || movingRef.current) return;
    // One snapshot covers maps that never emit a camera-change event on load.
    // A gesture or newer event invalidates it before the native promise returns.
    const requestKey = ++requestKeyRef.current;
    const viewStateRequest = mapRef.current?.getViewState();
    if (!viewStateRequest) return;
    void viewStateRequest
      .then(({ center, bounds }) => {
        if (requestKey !== requestKeyRef.current) return;
        publishViewport(center, bounds);
      })
      .catch(() => undefined);
    return () => {
      requestKeyRef.current += 1;
    };
  }, [hasViewportListener, mapRef, nativeReady, publishViewport]);

  const beginRegionChange = useCallback(() => {
    movingRef.current = true;
    requestKeyRef.current += 1;
  }, []);
  const completeRegionChange = useCallback(
    (center: unknown, bounds: unknown) => {
      movingRef.current = false;
      requestKeyRef.current += 1;
      publishViewport(center, bounds);
    },
    [publishViewport],
  );

  return { beginRegionChange, completeRegionChange };
}
