import type { CameraRef, MapRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useWindowDimensions } from "react-native";

import { tourismSheetOpenRatio } from "@/core/ui/tourism-bottom-sheet";
import {
  getMapFeatureCoordinate,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";
import {
  boundsPadding,
  deliverSelections,
  focusCameraDurationMs,
  focusZoom,
  isCameraAtTarget,
  noPadding,
  resetNorthDurationMs,
  type CameraState,
  type SelectionCallbacks,
} from "./center-map-camera";
import type { CenterMapProps } from "./center-map.types";

type PendingLocationFocus = Readonly<{ target: [number, number] }>;

type CameraFocusProps = Pick<
  CenterMapProps,
  | "focusBounds"
  | "focusCoordinate"
  | "focusCoordinateKey"
  | "focusLocationKey"
  | "focusSelection"
  | "initialBounds"
  | "onCenterPress"
  | "onEstablishmentPress"
  | "onLocationFocusChange"
  | "onOverlappingFeaturePress"
  | "resetNorthKey"
  | "selectionBottomInset"
  | "userLocation"
>;

/**
 * Moves the camera for every focus request (selection, search result, user
 * position, bounds, reset north) and tracks whether the map is still centred
 * on the tourist. The ficha opens immediately while the camera moves; the pin
 * is centred in the visible part of the map, above the open sheet.
 */
export function useMapCameraFocus({
  cameraRef,
  featurePressKeyRef,
  isActive,
  mapRef,
  nativeReady,
  props,
}: Readonly<{
  cameraRef: RefObject<CameraRef | null>;
  /** Bumped so an async press continuation knows it was superseded. */
  featurePressKeyRef: RefObject<number>;
  isActive: () => boolean;
  mapRef: RefObject<MapRef | null>;
  nativeReady: boolean;
  props: CameraFocusProps;
}>) {
  const {
    focusBounds,
    focusCoordinate = null,
    focusCoordinateKey,
    focusLocationKey,
    focusSelection = null,
    initialBounds,
    onCenterPress,
    onEstablishmentPress,
    onLocationFocusChange,
    onOverlappingFeaturePress,
    resetNorthKey,
    selectionBottomInset,
    userLocation = null,
  } = props;
  const pendingLocationFocusRef = useRef<PendingLocationFocus | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const fittedInitialBoundsRef = useRef(false);
  const selectionCallbacksRef = useRef<SelectionCallbacks>({
    onCenterPress,
    onEstablishmentPress,
    onOverlappingFeaturePress,
  });
  useEffect(() => {
    selectionCallbacksRef.current = {
      onCenterPress,
      onEstablishmentPress,
      onOverlappingFeaturePress,
    };
  });
  const { height: windowHeight } = useWindowDimensions();

  const focusCamera = useCallback(
    (target: [number, number]) => {
      cameraRef.current?.easeTo({
        center: target,
        duration: focusCameraDurationMs,
        easing: "ease",
        padding: {
          bottom: selectionBottomInset ?? windowHeight * tourismSheetOpenRatio,
          left: 0,
          right: 0,
          top: 0,
        },
        zoom: focusZoom,
      });
    },
    [cameraRef, selectionBottomInset, windowHeight],
  );
  const deliver = useCallback(
    (selections: readonly MapFeatureSelection[]) =>
      deliverSelections(selections, selectionCallbacksRef.current),
    [],
  );
  const focusSelections = useCallback(
    (selections: readonly MapFeatureSelection[], target: [number, number]) => {
      deliver(selections);
      focusCamera(target);
    },
    [deliver, focusCamera],
  );
  /** A press or gesture means the camera no longer heads to the tourist. */
  const cancelLocationFocus = useCallback(() => {
    pendingLocationFocusRef.current = null;
    onLocationFocusChange?.(false);
  }, [onLocationFocusChange]);
  /** Called once the camera settles; reports whether it reached the tourist. */
  const settleCamera = useCallback(
    (camera: CameraState, userInteraction: boolean) => {
      if (!isActive()) return;
      const pendingLocationFocus = pendingLocationFocusRef.current;
      if (
        pendingLocationFocus &&
        !userInteraction &&
        isCameraAtTarget(camera, pendingLocationFocus.target)
      ) {
        pendingLocationFocusRef.current = null;
        onLocationFocusChange?.(true);
        return;
      }
      // Cualquier otro movimiento deja de estar centrado en el turista.
      onLocationFocusChange?.(false);
      if (userInteraction) {
        // Si el turista retoma el gesto durante el enfoque GPS, lo cancela:
        // la cámara ya no llegará a su ubicación.
        pendingLocationFocusRef.current = null;
      }
    },
    [isActive, onLocationFocusChange],
  );

  useEffect(() => {
    if (!nativeReady || !initialBounds || fittedInitialBoundsRef.current)
      return;
    fittedInitialBoundsRef.current = true;
    cameraRef.current?.fitBounds(initialBounds, {
      padding: boundsPadding,
      duration: focusCameraDurationMs,
    });
  }, [cameraRef, initialBounds, nativeReady]);

  useEffect(() => {
    if (!focusSelection || !nativeReady) return;
    featurePressKeyRef.current += 1;
    focusSelections([focusSelection], getMapFeatureCoordinate(focusSelection));
  }, [featurePressKeyRef, focusSelection, focusSelections, nativeReady]);

  useEffect(() => {
    if (!nativeReady || !userLocation || focusLocationKey === undefined) {
      return;
    }
    if (focusedLocationKeyRef.current === focusLocationKey) return;
    focusedLocationKeyRef.current = focusLocationKey;
    pendingLocationFocusRef.current = {
      target: [userLocation.longitude, userLocation.latitude],
    };
    cameraRef.current?.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
  }, [cameraRef, focusLocationKey, nativeReady, userLocation]);

  useEffect(() => {
    if (
      !nativeReady ||
      !focusCoordinate ||
      focusCoordinateKey === undefined ||
      focusBounds
    ) {
      return;
    }
    cameraRef.current?.easeTo({
      center: [focusCoordinate.longitude, focusCoordinate.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
  }, [
    cameraRef,
    focusBounds,
    focusCoordinate,
    focusCoordinateKey,
    nativeReady,
  ]);

  useEffect(() => {
    if (!nativeReady || !focusBounds) return;
    cameraRef.current?.fitBounds(focusBounds, {
      padding: boundsPadding,
      duration: focusCameraDurationMs,
    });
  }, [cameraRef, focusBounds, focusCoordinateKey, nativeReady]);

  useEffect(() => {
    if (!resetNorthKey || !nativeReady) return;
    let cancelled = false;
    const viewStateRequest = mapRef.current?.getViewState();
    if (!viewStateRequest) return;
    void viewStateRequest
      .then(({ center }) => {
        if (cancelled || !isActive()) return;
        cameraRef.current?.easeTo({
          bearing: 0,
          center,
          duration: resetNorthDurationMs,
          easing: "ease",
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cameraRef, isActive, mapRef, nativeReady, resetNorthKey]);

  return { cancelLocationFocus, deliver, focusCamera, settleCamera };
}
