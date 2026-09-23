/**
 * Tiny external store for the live map bearing. MapLibre reports it on every
 * frame while the map rotates; subscribing only the compass keeps the rest of
 * the screen from re-rendering during the gesture.
 */
export function createMapBearingStore() {
  let bearing = 0;
  const listeners = new Set<() => void>();

  return {
    getBearing: () => bearing,
    setBearing: (next: number) => {
      if (next === bearing) return;
      bearing = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type MapBearingStore = ReturnType<typeof createMapBearingStore>;

/** The compass only shows once the map is rotated more than one degree. */
export function isMapRotated(bearing: number): boolean {
  return Math.abs(bearing) > 1;
}
