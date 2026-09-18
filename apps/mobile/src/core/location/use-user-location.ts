import * as Location from "expo-location";
import { AppState, Linking, Platform, type AppStateStatus } from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
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

const initialState: UserLocationState = {
  accuracy: null,
  coordinate: null,
  message: null,
  status: "idle",
};
const currentLocationTimeoutMs = 12_000;

/**
 * Obtiene una ubicación puntual únicamente cuando la pantalla la solicita.
 * No inicia un watcher ni solicita permisos al montar la app: el seguimiento
 * continuo queda reservado para una futura navegación activa.
 */
export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>(initialState);
  const requestInFlight = useRef<Promise<UserLocationCoordinate | null> | null>(
    null,
  );

  const requestLocation = useCallback(async () => {
    if (requestInFlight.current) return requestInFlight.current;

    const request = resolveUserLocation(setState);
    requestInFlight.current = request;
    try {
      return await request;
    } finally {
      requestInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.status !== "ready") return;

    let disposed = false;
    let checking = false;
    const syncAvailability = async () => {
      if (disposed || checking) return;
      checking = true;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!disposed) {
            setState((current) =>
              current.status === "ready"
                ? {
                    ...current,
                    coordinate: null,
                    message: "Activa el permiso de ubicación desde Ajustes.",
                    status: "denied",
                  }
                : current,
            );
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled && !disposed) {
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  coordinate: null,
                  message: "Activa el GPS para encontrar tu posición.",
                  status: "disabled",
                }
              : current,
          );
        }
      } catch {
        // Una comprobación fallida no debe desmontar el mapa ni borrar una
        // ubicación válida; el siguiente ciclo vuelve a intentarlo.
      } finally {
        checking = false;
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") void syncAvailability();
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    const availabilityTimer = setInterval(() => {
      if (AppState.currentState === "active") void syncAvailability();
    }, 5_000);
    void syncAvailability();

    return () => {
      disposed = true;
      subscription.remove();
      clearInterval(availabilityTimer);
    };
  }, [state.status]);

  return { ...state, requestLocation };
}

async function resolveUserLocation(
  setState: Dispatch<SetStateAction<UserLocationState>>,
): Promise<UserLocationCoordinate | null> {
  setState((current) => ({
    ...current,
    message: null,
    status: "requesting",
  }));

  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) {
        setState((current) => ({
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
      setState((current) => ({
        ...current,
        coordinate: null,
        message: "Necesitamos permiso para mostrar tu posición.",
        status: "denied",
      }));
      return null;
    }

    if (!(await ensureLocationServicesEnabled())) {
      setState((current) => ({
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

    setState({
      accuracy: location.coords.accuracy ?? null,
      coordinate,
      message: null,
      status: "ready",
    });
    return coordinate;
  } catch {
    setState((current) => ({
      ...current,
      coordinate: null,
      message:
        "No pudimos obtener tu ubicación. Revisa la señal GPS e inténtalo de nuevo.",
      status: "error",
    }));
    return null;
  }
}

/**
 * El permiso de la aplicación y el proveedor/GPS del dispositivo son estados
 * distintos. Cuando el permiso ya existe, el botón puede solicitar al sistema
 * que active el proveedor sin volver a mostrar el diálogo de permisos.
 */
async function ensureLocationServicesEnabled(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;

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
