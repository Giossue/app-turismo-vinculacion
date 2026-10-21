import { useRef, useState } from "react";

import type { GeoCoordinate } from "@/core/geo/types";

/**
 * «Actualizar ruta» durante una navegación cuyo recálculo remoto falló: pide
 * una posición fresca y vuelve a consultar desde ella. Si la persona no se
 * movió, repite la misma consulta en lugar de cambiar el origen.
 */
export function useNavigationRouteRetry({
  beginAttempt,
  enabled,
  origin,
  refetch,
  requestLocation,
  setOrigin,
}: Readonly<{
  beginAttempt: () => () => boolean;
  /** Navegación activa, sin ruta guardada ni cálculo en curso. */
  enabled: boolean;
  origin: GeoCoordinate | null;
  refetch: () => Promise<unknown>;
  requestLocation: (
    options?: Readonly<{ forceRefresh?: boolean }>,
  ) => Promise<GeoCoordinate | null>;
  setOrigin: (origin: GeoCoordinate) => void;
}>) {
  const [retrying, setRetrying] = useState(false);
  const inFlightRef = useRef(false);

  const retry = async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    setRetrying(true);
    const isCancelled = beginAttempt();
    try {
      const coordinate = await requestLocation({ forceRefresh: true });
      if (!coordinate || isCancelled()) return;
      if (
        origin?.latitude === coordinate.latitude &&
        origin.longitude === coordinate.longitude
      ) {
        await refetch();
      } else {
        setOrigin(coordinate);
      }
    } finally {
      inFlightRef.current = false;
      setRetrying(false);
    }
  };

  return { retry, retrying };
}
