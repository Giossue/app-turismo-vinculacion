import { describe, expect, it, vi } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import {
  deliverSelections,
  focusZoom,
  isCameraAtTarget,
} from "./center-map-camera";

const center = { code: "C1", name: "Centro" } as PublicCenter;
const establishment = { name: "Hotel" } as PublicMapEstablishment;

describe("isCameraAtTarget", () => {
  const target: [number, number] = [-79, -1.59];

  it("accepts rounding noise around the target at the focus zoom", () => {
    expect(
      isCameraAtTarget(
        { center: [-79.0005, -1.5895], zoom: focusZoom + 0.1 },
        target,
      ),
    ).toBe(true);
  });

  it.each([
    [{ center: [-79.002, -1.59] as [number, number], zoom: focusZoom }],
    [{ center: [-79, -1.592] as [number, number], zoom: focusZoom }],
    [{ center: [-79, -1.59] as [number, number], zoom: focusZoom + 0.2 }],
  ])("rejects a camera away from the target or zoom: %j", (camera) => {
    expect(isCameraAtTarget(camera, target)).toBe(false);
  });
});

describe("deliverSelections", () => {
  function makeCallbacks() {
    return {
      onCenterPress: vi.fn(),
      onEstablishmentPress: vi.fn(),
      onOverlappingFeaturePress: vi.fn(),
    };
  }

  it("opens the ficha of a single center or establishment", () => {
    const callbacks = makeCallbacks();
    deliverSelections([{ kind: "center", center }], callbacks);
    expect(callbacks.onCenterPress).toHaveBeenCalledWith(center);
    deliverSelections([{ kind: "establishment", establishment }], callbacks);
    expect(callbacks.onEstablishmentPress).toHaveBeenCalledWith(establishment);
    expect(callbacks.onOverlappingFeaturePress).not.toHaveBeenCalled();
  });

  it("opens the choices when several pins share the spot", () => {
    const callbacks = makeCallbacks();
    const selections = [
      { kind: "center" as const, center },
      { kind: "establishment" as const, establishment },
    ];
    deliverSelections(selections, callbacks);
    expect(callbacks.onOverlappingFeaturePress).toHaveBeenCalledWith(
      selections,
    );
    expect(callbacks.onCenterPress).not.toHaveBeenCalled();
  });

  it("does nothing without selections", () => {
    const callbacks = makeCallbacks();
    deliverSelections([], callbacks);
    expect(callbacks.onCenterPress).not.toHaveBeenCalled();
    expect(callbacks.onEstablishmentPress).not.toHaveBeenCalled();
    expect(callbacks.onOverlappingFeaturePress).not.toHaveBeenCalled();
  });
});
