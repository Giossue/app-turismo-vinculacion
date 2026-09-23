import { describe, expect, it, vi } from "vitest";

import { createMapBearingStore, isMapRotated } from "./map-bearing-store";

describe("createMapBearingStore", () => {
  it("notifies subscribers only when the bearing changes", () => {
    const store = createMapBearingStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setBearing(0);
    store.setBearing(42);
    store.setBearing(42);

    expect(store.getBearing()).toBe(42);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setBearing(10);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("treats a bearing within one degree as north", () => {
    expect(isMapRotated(0.8)).toBe(false);
    expect(isMapRotated(-1)).toBe(false);
    expect(isMapRotated(12)).toBe(true);
  });
});
