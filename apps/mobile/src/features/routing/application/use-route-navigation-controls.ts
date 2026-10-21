import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import type { GeoCoordinate } from "@/core/geo/types";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import type { PersistedNavigationLocation } from "../data/navigation-session-storage";
import type { useBackgroundTrackingPreference } from "./use-background-tracking-preference";

type RequestLocation = (
  options?: Readonly<{ forceRefresh?: boolean }>,
) => Promise<GeoCoordinate | null>;

/**
 * Inicio, parada y cancelación de la navegación de «Cómo llegar». La pantalla
 * solo alterna `navigationActive`; `useNavigationSession` es dueña del
 * seguimiento y de su limpieza.
 *
 * Cada intento recibe un número: cerrar, detener o salir de la pantalla
 * invalida los intentos pendientes (`cancelPending`), y `beginAttempt`
 * devuelve la comprobación para operaciones asíncronas posteriores.
 */
export function useRouteNavigationControls({
  backgroundPreference,
  locationAccuracy,
  onStopped,
  requestLocation,
}: Readonly<{
  backgroundPreference: ReturnType<typeof useBackgroundTrackingPreference>;
  locationAccuracy: number | null;
  onStopped: () => void;
  requestLocation: RequestLocation;
}>) {
  const auth = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [navigationActive, setNavigationActive] = useState(false);
  const [startLocation, setStartLocation] =
    useState<PersistedNavigationLocation | null>(null);
  const [startingNavigation, setStartingNavigation] = useState(false);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  // Evita dobles toques antes de que llegue el render de `startingNavigation`.
  const startInFlightRef = useRef(false);
  const startAttemptRef = useRef(0);

  const cancelPending = () => {
    startAttemptRef.current += 1;
  };
  const beginAttempt = () => {
    const attempt = ++startAttemptRef.current;
    return () => attempt !== startAttemptRef.current || !navigation.isFocused();
  };

  // `blur` llega cuando otra pantalla cubre esta, nunca en un desmontaje
  // simple; salir de la pantalla termina una navegación activa.
  useEffect(
    () =>
      navigation.addListener("blur", () => {
        startAttemptRef.current += 1;
        setNavigationActive(false);
      }),
    [navigation],
  );

  // Atrás cancela un inicio que espera el GPS; la navegación activa usa su X.
  useScreenBackHandler(() => {
    if (startingNavigation) startAttemptRef.current += 1;
    return navigationActive;
  });

  /** `ready` indica que hay destino y ruta calculada para empezar. */
  const start = async (ready: boolean) => {
    if (!ready || navigationActive || startInFlightRef.current) return;

    if (auth.status !== "authenticated") {
      if (auth.status === "anonymous") {
        router.push(buildLoginHref("/route"));
      }
      return;
    }

    const isCancelled = beginAttempt();
    startInFlightRef.current = true;
    setStartingNavigation(true);
    try {
      // La sesión pide su propia lectura fresca al arrancar: aquí basta la
      // última posición válida del proveedor para no esperar dos veces al GPS.
      const coordinate = await requestLocation();
      if (!coordinate || isCancelled()) return;
      // Solo con la opción activada se piden los permisos para seguir la ruta
      // fuera de la app; un rechazo deja la navegación en primer plano.
      const outcome = await backgroundPreference.request(isCancelled);
      if (isCancelled()) return;
      setBackgroundTrackingEnabled(outcome.enabled);
      setStartLocation({
        accuracy: locationAccuracy,
        coordinate,
        timestamp: Date.now(),
      });
      setNavigationActive(true);
    } finally {
      startInFlightRef.current = false;
      setStartingNavigation(false);
    }
  };

  const stop = () => {
    startAttemptRef.current += 1;
    onStopped();
    setNavigationActive(false);
    setStartLocation(null);
    setBackgroundTrackingEnabled(false);
  };

  return {
    backgroundTrackingEnabled,
    beginAttempt,
    cancelPending,
    navigationActive,
    start,
    startingNavigation,
    startLocation,
    stop,
  };
}
