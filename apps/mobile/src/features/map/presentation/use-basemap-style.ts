import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";

import type { TurismoColorScheme } from "@/core/ui/tokens";
import {
  getCachedSelfHostedMapStyle,
  getFallbackMapStyle,
  loadSelfHostedMapStyle,
  retryBasemapWhenOnline,
} from "../data/basemap-style";

type LoadedStyle = Readonly<{
  scheme: TurismoColorScheme;
  style: StyleSpecification;
}>;

/**
 * Self-hosted basemap for `scheme`, or the neutral fallback while it loads or
 * when the tile server is unreachable. Pins and controls keep working either
 * way.
 */
export function useBasemapStyle(
  scheme: TurismoColorScheme,
  enabled = true,
): StyleSpecification {
  const [loaded, setLoaded] = useState<LoadedStyle | null>(() => {
    const cached = getCachedSelfHostedMapStyle(scheme);
    return cached ? { scheme, style: cached } : null;
  });

  const hasStyle = loaded?.scheme === scheme;

  useEffect(() => {
    if (!enabled || hasStyle) return;
    let cancelled = false;
    const load = () => {
      loadSelfHostedMapStyle(scheme)
        .then((style) => {
          if (!cancelled) setLoaded({ scheme, style });
        })
        .catch(() => {
          // El estilo vacío conserva la exploración y los pines si el servidor
          // propio está temporalmente fuera de línea.
        });
    };
    load();
    const stopRetrying = retryBasemapWhenOnline(load);
    return () => {
      cancelled = true;
      stopRetrying();
    };
  }, [scheme, enabled, hasStyle]);

  return hasStyle ? loaded.style : getFallbackMapStyle(scheme);
}
