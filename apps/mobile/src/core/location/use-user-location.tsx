import * as Location from "expo-location";
import { AppState, type AppStateStatus } from "react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { GeoCoordinate } from "../geo/types";
import { getLocationAvailability } from "./location-availability";
import { toCoordinate } from "./location-coordinate";
import { isReliableLocationAccuracy } from "./location-quality";
import {
  toUnavailableState,
  withTimeout,
  type UserLocationState,
} from "./location-session-helpers";
import {
  UserLocationActionsContext,
  UserLocationStateContext,
  UserLocationStatusContext,
  type UserLocationActions,
  type UserLocationStatusValue,
} from "./user-location-context";

export {
  useUserLocation,
  useUserLocationActions,
  useUserLocationStatus,
  type UserLocationActions,
  type UserLocationContextValue,
  type UserLocationStatusValue,
} from "./user-location-context";

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
/**
 * How often an enabled session without a healthy watcher re-checks permission
 * and GPS provider. Returning to the foreground and watcher errors already
 * trigger a check, so this is only a safety net (e.g. the provider turned off
 * while the watcher could not be started).
 */
const availabilitySyncIntervalMs = 30_000;
const foregroundLocationOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  timeInterval: 5_000,
};

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
  // Mirrors `trackingEnabledRef` so the availability timer effect can start
  // only once the session is in use.
  const [trackingEnabled, setTrackingEnabled] = useState(false);
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

    // Dropping the subscription also hands the session back to the
    // availability timer, which retries the watcher on its next tick.
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
            // Only explicit "my location" taps reach here. Clearing the
            // coordinate makes the status pass through `requesting` again,
            // which is what Explore uses to recenter the camera once the new
            // fix is ready (see `useExploreLocationFocus`).
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
            // El watcher puede haber recibido un punto preciso mientras la
            // lectura puntual devolvía uno amplio. Conserva el punto válido.
            if (stateRef.current.coordinate) return stateRef.current.coordinate;
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
          if (stateRef.current.coordinate) return stateRef.current.coordinate;
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
      setTrackingEnabled(true);
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
        // Volver al primer plano no borra la coordenada: se reanuda el watcher
        // (o se lee una nueva posición solo si no había una válida). Así la
        // cámara de Explorar no salta a la persona en cada regreso; un salto
        // lo pide únicamente el botón «mi ubicación» con `forceRefresh`.
        void syncAvailability(false);
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

    return () => {
      subscription.remove();
      stopForegroundTracking();
    };
  }, [stopForegroundTracking, syncAvailability]);

  useEffect(() => {
    if (!trackingEnabled) return;

    const availabilityTimer = setInterval(() => {
      // A live subscription is removed on its first error, so its presence
      // means the watcher is healthy and the bridge calls can be skipped.
      if (
        AppState.currentState !== "active" ||
        foregroundSubscriptionRef.current
      ) {
        return;
      }
      void syncAvailability(false);
    }, availabilitySyncIntervalMs);

    return () => {
      clearInterval(availabilityTimer);
    };
  }, [syncAvailability, trackingEnabled]);

  const actions = useMemo<UserLocationActions>(
    () => ({ requestLocation, setForegroundTrackingSuspended }),
    [requestLocation, setForegroundTrackingSuspended],
  );
  const statusValue = useMemo<UserLocationStatusValue>(
    () => ({ message: state.message, status: state.status }),
    [state.message, state.status],
  );

  return (
    <UserLocationActionsContext.Provider value={actions}>
      <UserLocationStatusContext.Provider value={statusValue}>
        <UserLocationStateContext.Provider value={state}>
          {children}
        </UserLocationStateContext.Provider>
      </UserLocationStatusContext.Provider>
    </UserLocationActionsContext.Provider>
  );
}
