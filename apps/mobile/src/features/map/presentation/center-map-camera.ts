import { turismoSpacing } from "@/core/ui/tokens";
import type { MapFeatureSelection } from "../domain/map-feature-selection";
import type { CenterMapProps } from "./center-map.types";

export type CameraState = Readonly<{ center: [number, number]; zoom: number }>;
export type SelectionCallbacks = Pick<
  CenterMapProps,
  "onCenterPress" | "onEstablishmentPress" | "onOverlappingFeaturePress"
>;

// Guaranda, until the tourist's position or a selection moves the camera.
export const initialViewState: CameraState = {
  center: [-79.00098, -1.59263],
  zoom: 14,
};
export const maxMapZoom = 19;
/** Zoom used to focus a selected pin, a search result or the user. */
export const focusZoom = 15;
export const focusCameraDurationMs = 300;
export const resetNorthDurationMs = 240;
const cameraTargetTolerance = 0.001;
const cameraZoomTolerance = 0.15;
/** MapLibre conserva el padding entre movimientos: los demás enfoques lo anulan. */
export const noPadding = { bottom: 0, left: 0, right: 0, top: 0 };
/** Margin kept around a fitted bounding box. */
export const boundsPadding = {
  top: turismoSpacing.md,
  bottom: turismoSpacing.md,
  left: turismoSpacing.md,
  right: turismoSpacing.md,
};

/** True when `camera` rests on `target` at the focus zoom. */
export function isCameraAtTarget(
  { center: [longitude, latitude], zoom }: CameraState,
  [targetLongitude, targetLatitude]: [number, number],
): boolean {
  return (
    Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
    Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
    Math.abs(zoom - focusZoom) <= cameraZoomTolerance
  );
}

/** Opens the sheet for one selection, or the choices for several. */
export function deliverSelections(
  selections: readonly MapFeatureSelection[],
  callbacks: SelectionCallbacks,
): void {
  const [selection] = selections;
  if (selections.length > 1) {
    callbacks.onOverlappingFeaturePress(selections);
  } else if (selection?.kind === "center") {
    callbacks.onCenterPress(selection.center);
  } else if (selection?.kind === "establishment") {
    callbacks.onEstablishmentPress(selection.establishment);
  }
}
