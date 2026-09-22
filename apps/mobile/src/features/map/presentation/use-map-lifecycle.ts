import type { MapRef } from "@maplibre/maplibre-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * - `loading`: the first style is still loading.
 * - `ready` / `failed`: the native map answered and camera calls are safe.
 * - `reloading`: a new style loads after the map was already usable.
 */
export type MapLoadState = "loading" | "ready" | "failed" | "reloading";

/**
 * Tracks whether the native MapLibre view can receive camera commands. Native
 * callbacks can arrive after unmount, so async continuations should check
 * `isActive()` before touching the map.
 */
export function useMapLifecycle(mapRef: RefObject<MapRef | null>) {
  const mountedRef = useRef(false);
  const readyRef = useRef(false);
  const [loadState, setLoadState] = useState<MapLoadState>("loading");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readyRef.current = false;
    };
  }, []);

  const markLoading = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState((current) => (current === "loading" ? current : "reloading"));
  }, []);

  const markReady = useCallback(() => {
    if (!mountedRef.current) return;
    readyRef.current = true;
    setLoadState("ready");
  }, []);

  const markFailed = useCallback(() => {
    if (!mountedRef.current) return;
    readyRef.current = true;
    setLoadState("failed");
  }, []);

  const isActive = useCallback(
    () => mountedRef.current && readyRef.current,
    [],
  );

  const showAttribution = useCallback(() => {
    if (!isActive()) return;
    const attributionRequest = mapRef.current?.showAttribution();
    void attributionRequest?.catch(() => undefined);
  }, [isActive, mapRef]);

  return {
    isActive,
    loadState,
    markFailed,
    markLoading,
    markReady,
    /** True once the map answered for the first time; it never goes back. */
    nativeReady: loadState !== "loading",
    showAttribution,
    showLoadingOverlay: loadState === "loading" || loadState === "reloading",
  };
}
