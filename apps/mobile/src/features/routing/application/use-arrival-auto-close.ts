import { useEffect, useEffectEvent, useState } from "react";

/** Tiempo que la llegada queda en pantalla antes de cerrar la navegación. */
export const arrivalAutoCloseSeconds = 60;

/**
 * Cuenta regresiva desde la llegada; llama a `onExpire` al llegar a cero.
 * Devuelve los segundos restantes, o `null` mientras no se haya llegado.
 *
 * El plazo es absoluto: también cuenta el tiempo con la app oculta.
 */
export function useArrivalAutoClose(
  arrived: boolean,
  onExpire: () => void,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    if (!arrived) return;
    const deadline = Date.now() + arrivalAutoCloseSeconds * 1000;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) expire();
    }, 1000);
    return () => {
      clearInterval(interval);
      setSecondsLeft(null);
    };
  }, [arrived]);

  return arrived ? (secondsLeft ?? arrivalAutoCloseSeconds) : null;
}
