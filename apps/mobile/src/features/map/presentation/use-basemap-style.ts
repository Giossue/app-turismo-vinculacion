import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";

import type { TurismoColorScheme } from "@/core/ui/tokens";
import {
  getCachedSelfHostedMapStyle,
  getFallbackMapStyle,
  loadSelfHostedMapStyle,
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
): StyleSpecification {
  const [loaded, setLoaded] = useState<LoadedStyle | null>(() => {
    const cached = getCachedSelfHostedMapStyle(scheme);
    return cached ? { scheme, style: cached } : null;
  });

  useEffect(() => {
    let cancelled = false;
    loadSelfHostedMapStyle(scheme)
      .then((style) => {
        if (!cancelled) setLoaded({ scheme, style });
      })
      .catch(() => {
        // El estilo vacío conserva la exploración y los pines si el servidor
        // propio está temporalmente fuera de línea.
      });
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  return loaded?.scheme === scheme ? loaded.style : getFallbackMapStyle(scheme);
}
