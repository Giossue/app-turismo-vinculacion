import { useEffect, useSyncExternalStore } from "react";

import { readStoredTrip, saveStoredTrip } from "../data/trip-storage";
import {
  addTripStop,
  moveTripStop,
  removeTripStop,
  type AddTripStopResult,
  type TripStop,
} from "../domain/trip";

/**
 * Recorrido compartido por todas las pantallas (fichas, hojas del mapa y
 * «Mi recorrido»). Se carga una vez desde el dispositivo y cada cambio se
 * guarda; un fallo al guardar conserva el recorrido en memoria.
 */
let stops: readonly TripStop[] = [];
let hydration: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: readonly TripStop[]) {
  stops = next;
  for (const listener of listeners) listener();
  void saveStoredTrip(next);
}

function hydrate(): Promise<void> {
  hydration ??= readStoredTrip().then((stored) => {
    // Un cambio hecho mientras se leía gana sobre lo guardado.
    if (stops.length === 0 && stored.length > 0) {
      stops = stored;
      for (const listener of listeners) listener();
    }
  });
  return hydration;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => stops;

export function useTrip() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void hydrate();
  }, []);

  return {
    stops: current,
    add: (stop: TripStop): AddTripStopResult["outcome"] => {
      const result = addTripStop(stops, stop);
      if (result.outcome === "added") emit(result.stops);
      return result.outcome;
    },
    clear: () => emit([]),
    move: (key: string, offset: -1 | 1) =>
      emit(moveTripStop(stops, key, offset)),
    remove: (key: string) => emit(removeTripStop(stops, key)),
  };
}
