import * as Location from "expo-location";
import { AppState, type AppStateStatus } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { GeoCoordinate } from "../geo/types";
import {
  getLocationAvailability,
  locationUnavailableMessages,
  type LocationUnavailableReason,
} from "./location-availability";
import { toCoordinate } from "./location-coordinate";
import { isReliableLocationAccuracy } from "./location-quality";

type UserLocationStatus =
  "idle" | "requesting" | "ready" | "denied" | "disabled" | "error";

type UserLocationState = Readonly<{
  accuracy: number | null;
  coordinate: GeoCoordinate | null;
  message: string | null;
  status: UserLocationStatus;
}>;

type UserLocationContextValue = UserLocationState & {
  requestLocation: (
    options?: Readonly<{ forceRefresh?: boolean }>,
  ) => Promise<GeoCoordinate | null>;
  setForegroundTrackingSuspended: (suspended: boolean) => void;
};

type LocationReadOptions = Readonly<{
  allowPermissionRequest: boolean;
  allowProviderPrompt: boolean;
  forceRefresh: boolean;
  showRequesting: boolean;
}>;

const initialState: UserLocationState = {
  accuracy: null,
  coordinate: null,
  message: null,
  status: "idle",
};
const currentLocationTimeoutMs = 12_000;
/** How often the visible session re-checks permission and GPS provider. */
const availabilitySyncIntervalMs = 5_000;
const foregroundLocationOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  timeInterval: 5_000,
};

const UserLocationContext = createContext<UserLocationContextValue | null>(
  null,
);

/**
 * Mantiene una única sesión de ubicación para todas las pantallas del móvil.
 *
 * La sesión empieza únicamente cuando una acción de la persona necesita su
 * ubicación. Desde ese momento se conserva la última posición al cambiar de
 * pantalla, se actualiza mientras la app está activa y se reanuda al volver al
 * primer plano. El seguimiento en segundo plano de navegación se mantiene en
 * su tarea específica y no se inicia desde este proveedor.
 */
export function UserLocationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<UserLocationState>(initialState);
  const stateRef = useRef<UserLocationState>(initialState);
  const trackingEnabledRef = useRef(false);
  const foregroundTrackingSuspendedRef = useRef(false);
  const foregroundSubscriptionRef =
    useRef<Location.LocationSubscription | null>(null);
  const foregroundStartRef = useRef<Promise<void> | null>(null);
  const locationReadRef = useRef<Promise<GeoCoordinate | null> | null>(null);
  const availabilityCheckRef = useRef(false);

  const updateState = useCallback(
    (
      updater:
        UserLocationState | ((current: UserLocationState) => UserLocationState),
    ) => {
      // Every update goes through here, so the ref always holds the latest
      // state and the next value can be computed outside a pure updater.
      const next =
        typeof updater === "function" ? updater(stateRef.current) : updater;
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  const stopForegroundTracking = useCallback(() => {
    const subscription = foregroundSubscriptionRef.current;
    foregroundSubscriptionRef.current = null;
    subscription?.remove();
  }, []);

  const handleForegroundLocation = useCallback(
    (location: Location.LocationObject) => {
      const accuracy = location.coords.accuracy ?? null;
      if (!isReliableLocationAccuracy(accuracy)) {
        updateState((current) => ({
          ...current,
          accuracy,
          message: "Ajustando tu ubicación con el GPS…",
          status: current.coordinate ? "ready" : "requesting",
        }));
        return;
      }

      updateState({
        accuracy,
        coordinate: toCoordinate(location),
        message: null,
        status: "ready",
      });
    },
    [updateState],
  );

  const handleForegroundLocationError = useCallback(() => {
    if (!trackingEnabledRef.current || AppState.currentState !== "active") {
      return;
    }

    stopForegroundTracking();
    updateState((current) => ({
      ...current,
      coordinate: null,
      message:
        "No pudimos actualizar tu ubicación. Revisa la señal GPS e inténtalo de nuevo.",
      status: "error",
    }));
  }, [stopForegroundTracking, updateState]);

  const startForegroundTracking = useCallback(async () => {
    if (
      !trackingEnabledRef.current ||
      foregroundTrackingSuspendedRef.current ||
      AppState.currentState !== "active" ||
      foregroundSubscriptionRef.current ||
      foregroundStartRef.current
    ) {
      return;
    }

    const start = (async () => {
      try {
        const availability = await getLocationAvailability();
        if (availability !== "available") {
          stopForegroundTracking();
          updateState((current) => toUnavailableState(current, availability));
          return;
        }

        const subscription = await Location.watchPositionAsync(
          foregroundLocationOptions,
          handleForegroundLocation,
          handleForegroundLocationError,
        );

        if (
          !trackingEnabledRef.current ||
          foregroundTrackingSuspendedRef.current ||
          AppState.currentState !== "active"
        ) {
          subscription.remove();
          return;
        }

        foregroundSubscriptionRef.current = subscription;
      } catch {
        if (trackingEnabledRef.current && AppState.currentState === "active") {
          updateState((current) => ({
            ...current,
            coordinate: null,
            message:
              "No pudimos iniciar el seguimiento de ubicación. Inténtalo de nuevo.",
            status: "error",
          }));
        }
      }
    })();

    foregroundStartRef.current = start;
    try {
      await start;
    } finally {
      if (foregroundStartRef.current === start) {
        foregroundStartRef.current = null;
      }
    }
  }, [
    handleForegroundLocation,
    handleForegroundLocationError,
    stopForegroundTracking,
    updateState,
  ]);

  const readAndStoreLocation = useCallback(
    (options: LocationReadOptions): Promise<GeoCoordinate | null> => {
      if (locationReadRef.current) return locationReadRef.current;

      const read = (async () => {
        if (options.showRequesting) {
          updateState((current) => ({
            ...current,
            message: null,
            status: "requesting",
          }));
        }

        try {
          const availability = await getLocationAvailability({
            promptProvider: options.allowProviderPrompt,
            requestPermission: options.allowPermissionRequest,
          });
          if (availability !== "available") {
            stopForegroundTracking();
            updateState((current) => toUnavailableState(current, availability));
            return null;
          }

          if (options.forceRefresh) {
            updateState((current) => ({
              ...current,
              accuracy: null,
              coordinate: null,
              message: "Buscando una ubicación GPS precisa…",
              status: "requesting",
            }));
          }

          // Arranca el watcher antes de la lectura puntual. En un arranque en
          // frío la primera muestra puede ser amplia, pero una actualización
          // posterior sí puede alcanzar la precisión necesaria.
          void startForegroundTracking();
          const location = await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }),
            currentLocationTimeoutMs,
          );
          const accuracy = location.coords.accuracy ?? null;
          if (!isReliableLocationAccuracy(accuracy)) {
            updateState((current) => ({
              ...current,
              accuracy,
              coordinate: null,
              message: "Ajustando tu ubicación con el GPS…",
              status: "requesting",
            }));
            return null;
          }

          const coordinate = toCoordinate(location);

          updateState({
            accuracy,
            coordinate,
            message: null,
            status: "ready",
          });
          // La lectura puntual no debe esperar a que el watcher foreground
          // termine de registrarse. Las rutas necesitan la coordenada ya
          // obtenida y el seguimiento puede continuar de forma asíncrona.
          void startForegroundTracking();
          return coordinate;
        } catch {
          // La lectura puntual puede agotar su tiempo mientras el watcher
          // todavía espera una primera señal válida. No lo detengas: puede
          // entregar la coordenada fresca que la lectura puntual no alcanzó.
          updateState((current) => ({
            ...current,
            coordinate: null,
            message:
              "No pudimos obtener tu ubicación. Revisa la señal GPS e inténtalo de nuevo.",
            status: "error",
          }));
          return null;
        }
      })();

      locationReadRef.current = read;
      void read.finally(() => {
        if (locationReadRef.current === read) {
          locationReadRef.current = null;
        }
      });
      return read;
    },
    [startForegroundTracking, stopForegroundTracking, updateState],
  );

  const syncAvailability = useCallback(
    async (refreshLocation: boolean) => {
      if (
        !trackingEnabledRef.current ||
        foregroundTrackingSuspendedRef.current ||
        availabilityCheckRef.current ||
        AppState.currentState !== "active"
      ) {
        return;
      }

      availabilityCheckRef.current = true;
      try {
        const availability = await getLocationAvailability();
        if (availability !== "available") {
          stopForegroundTracking();
          updateState((current) => toUnavailableState(current, availability));
          return;
        }

        const current = stateRef.current;
        if (
          refreshLocation ||
          current.status !== "ready" ||
          !current.coordinate
        ) {
          await readAndStoreLocation({
            allowPermissionRequest: false,
            allowProviderPrompt: false,
            forceRefresh: refreshLocation,
            showRequesting: refreshLocation || !current.coordinate,
          });
          return;
        }

        await startForegroundTracking();
      } catch {
        // La ubicación actual sigue siendo válida hasta que una comprobación
        // posterior confirme que el permiso o el proveedor fueron revocados.
      } finally {
        availabilityCheckRef.current = false;
      }
    },
    [
      readAndStoreLocation,
      startForegroundTracking,
      stopForegroundTracking,
      updateState,
    ],
  );

  const requestLocation = useCallback(
    async (options: Readonly<{ forceRefresh?: boolean }> = {}) => {
      const forceRefresh = options.forceRefresh === true;
      trackingEnabledRef.current = true;
      const currentCoordinate = stateRef.current.coordinate;
      if (currentCoordinate && !forceRefresh) {
        // La sesión comparte una lectura que ya pasó el filtro de precisión;
        // las acciones que necesitan el punto actual pueden forzar una nueva.
        void startForegroundTracking();
        return currentCoordinate;
      }

      return readAndStoreLocation({
        allowPermissionRequest: true,
        allowProviderPrompt: true,
        forceRefresh,
        showRequesting: true,
      });
    },
    [readAndStoreLocation, startForegroundTracking],
  );

  const setForegroundTrackingSuspended = useCallback(
    (suspended: boolean) => {
      foregroundTrackingSuspendedRef.current = suspended;
      if (suspended) {
        stopForegroundTracking();
      } else if (trackingEnabledRef.current) {
        // Al reanudar el watcher basta sincronizar disponibilidad; una lectura
        // puntual nueva aquí puede fallar transitoriamente y ensuciar una ruta
        // que ya tiene un origen válido.
        void syncAvailability(false);
      }
    },
    [stopForegroundTracking, syncAvailability],
  );

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void syncAvailability(true);
      } else {
        // Explorar usa solo permiso foreground. La tarea persistente pertenece
        // exclusivamente a una navegación activa.
        stopForegroundTracking();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    const availabilityTimer = setInterval(() => {
      if (AppState.currentState === "active") {
        void syncAvailability(false);
      }
    }, availabilitySyncIntervalMs);

    return () => {
      subscription.remove();
      clearInterval(availabilityTimer);
      stopForegroundTracking();
    };
  }, [stopForegroundTracking, syncAvailability]);

  const value: UserLocationContextValue = {
    ...state,
    requestLocation,
    setForegroundTrackingSuspended,
  };

  return (
    <UserLocationContext.Provider value={value}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocation(): UserLocationContextValue {
  const context = useContext(UserLocationContext);
  if (!context) {
    throw new Error(
      "useUserLocation debe usarse dentro de UserLocationProvider.",
    );
  }
  return context;
}

function toUnavailableState(
  current: UserLocationState,
  reason: LocationUnavailableReason,
): UserLocationState {
  return {
    ...current,
    coordinate: null,
    message: locationUnavailableMessages[reason],
    status: reason === "services-disabled" ? "disabled" : "denied",
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Location request timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
