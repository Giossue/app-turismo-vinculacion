import * as Location from "expo-location";
import { AppState, Linking, Platform, type AppStateStatus } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type UserLocationCoordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type UserLocationStatus =
  "idle" | "requesting" | "ready" | "denied" | "disabled" | "error";

type UserLocationState = Readonly<{
  accuracy: number | null;
  coordinate: UserLocationCoordinate | null;
  message: string | null;
  status: UserLocationStatus;
}>;

type UserLocationContextValue = UserLocationState & {
  requestLocation: () => Promise<UserLocationCoordinate | null>;
  setForegroundTrackingSuspended: (suspended: boolean) => void;
};

type LocationReadOptions = Readonly<{
  allowPermissionRequest: boolean;
  allowProviderPrompt: boolean;
  showRequesting: boolean;
}>;

const initialState: UserLocationState = {
  accuracy: null,
  coordinate: null,
  message: null,
  status: "idle",
};
const currentLocationTimeoutMs = 12_000;
const foregroundLocationOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
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
  const locationReadRef = useRef<Promise<UserLocationCoordinate | null> | null>(
    null,
  );
  const availabilityCheckRef = useRef(false);

  const updateState = useCallback(
    (
      updater:
        UserLocationState | ((current: UserLocationState) => UserLocationState),
    ) => {
      setState((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        stateRef.current = next;
        return next;
      });
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
      updateState({
        accuracy: location.coords.accuracy ?? null,
        coordinate: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
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
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          stopForegroundTracking();
          updateState((current) => ({
            ...current,
            coordinate: null,
            message: "Activa el permiso de ubicación desde Ajustes.",
            status: "denied",
          }));
          return;
        }

        if (!(await Location.hasServicesEnabledAsync())) {
          stopForegroundTracking();
          updateState((current) => ({
            ...current,
            coordinate: null,
            message: "Activa el GPS para encontrar tu posición.",
            status: "disabled",
          }));
          return;
        }

        const subscription = await Location.watchPositionAsync(
          foregroundLocationOptions,
          handleForegroundLocation,
          handleForegroundLocationError,
        );

        if (!trackingEnabledRef.current || AppState.currentState !== "active") {
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
    (options: LocationReadOptions): Promise<UserLocationCoordinate | null> => {
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
          let permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted && options.allowPermissionRequest) {
            if (!permission.canAskAgain) {
              updateState((current) => ({
                ...current,
                coordinate: null,
                message: "Activa el permiso de ubicación desde Ajustes.",
                status: "denied",
              }));
              return null;
            }
            permission = await Location.requestForegroundPermissionsAsync();
          }

          if (!permission.granted) {
            stopForegroundTracking();
            updateState((current) => ({
              ...current,
              coordinate: null,
              message: options.allowPermissionRequest
                ? "Necesitamos permiso para mostrar tu posición."
                : "Activa el permiso de ubicación desde Ajustes.",
              status: "denied",
            }));
            return null;
          }

          if (
            !(await ensureLocationServicesEnabled(options.allowProviderPrompt))
          ) {
            stopForegroundTracking();
            updateState((current) => ({
              ...current,
              coordinate: null,
              message: "Activa el GPS para encontrar tu posición.",
              status: "disabled",
            }));
            return null;
          }

          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 30_000,
            requiredAccuracy: 200,
          });
          const location =
            lastKnown ??
            (await withTimeout(
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              currentLocationTimeoutMs,
            ));
          const coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          } satisfies UserLocationCoordinate;

          updateState({
            accuracy: location.coords.accuracy ?? null,
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
          stopForegroundTracking();
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
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          stopForegroundTracking();
          updateState((current) => ({
            ...current,
            coordinate: null,
            message: "Activa el permiso de ubicación desde Ajustes.",
            status: "denied",
          }));
          return;
        }

        if (!(await Location.hasServicesEnabledAsync())) {
          stopForegroundTracking();
          updateState((current) => ({
            ...current,
            coordinate: null,
            message: "Activa el GPS para encontrar tu posición.",
            status: "disabled",
          }));
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
            showRequesting: !current.coordinate,
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

  const requestLocation = useCallback(async () => {
    trackingEnabledRef.current = true;
    const currentCoordinate = stateRef.current.coordinate;
    if (currentCoordinate) {
      // Reutiliza la posición compartida mientras el watcher busca la
      // siguiente actualización; una ruta no debe quedar esperando otra
      // lectura puntual si ya existe una coordenada válida.
      void startForegroundTracking();
      return currentCoordinate;
    }

    return readAndStoreLocation({
      allowPermissionRequest: true,
      allowProviderPrompt: true,
      showRequesting: true,
    });
  }, [readAndStoreLocation, startForegroundTracking]);

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
    }, 5_000);

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

/**
 * El permiso de la aplicación y el proveedor/GPS del dispositivo son estados
 * distintos. Cuando el permiso ya existe, el botón puede solicitar al sistema
 * que active el proveedor sin volver a mostrar el diálogo de permisos.
 */
async function ensureLocationServicesEnabled(
  allowProviderPrompt: boolean,
): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (!allowProviderPrompt) return false;

  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      return false;
    }
    return Location.hasServicesEnabledAsync();
  }

  // iOS no expone un diálogo equivalente para activar el proveedor global;
  // abre los ajustes de la aplicación para que la persona lo habilite.
  try {
    await Linking.openSettings();
  } catch {
    // El estado inferior comunica que debe activarse manualmente.
  }
  return Location.hasServicesEnabledAsync();
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
