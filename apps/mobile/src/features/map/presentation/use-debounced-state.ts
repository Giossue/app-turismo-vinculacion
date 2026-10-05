import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State whose updates settle after `delayMs` of silence (trailing debounce).
 * A pending update is dropped on unmount, so it never reaches a dead component.
 */
export function useDebouncedState<T>(
  initialValue: T,
  delayMs: number,
): readonly [T, (next: T) => void] {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const schedule = useCallback(
    (next: T) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setValue(next);
      }, delayMs);
    },
    [delayMs],
  );

  return [value, schedule] as const;
}
