import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import { getTurismoMapColors, type TurismoColorScheme } from "@/core/ui/tokens";
import { basemapFillRules, basemapPalettes } from "./basemap-palette";

const styleCache = new Map<TurismoColorScheme, StyleSpecification>();
const pendingStyles = new Map<
  TurismoColorScheme,
  Promise<StyleSpecification>
>();

/** URL of the self-hosted TileServer GL style, if this build configures one. */
export function getSelfHostedStyleUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_TILESERVER_STYLE_URL?.trim() || undefined;
}

/** The normalized style already loaded for `scheme`, if any. */
export function getCachedSelfHostedMapStyle(
  scheme: TurismoColorScheme,
): StyleSpecification | null {
  return styleCache.get(scheme) ?? null;
}

/**
 * Loads the self-hosted style once per scheme and recolors it with the
 * Turismo basemap palette. Concurrent callers share the same request.
 */
export function loadSelfHostedMapStyle(
  scheme: TurismoColorScheme,
): Promise<StyleSpecification> {
  const cached = styleCache.get(scheme);
  if (cached) return Promise.resolve(cached);

  const pending = pendingStyles.get(scheme);
  if (pending) return pending;

  const styleUrl = getSelfHostedStyleUrl();
  if (!styleUrl) {
    return Promise.reject(
      new Error("EXPO_PUBLIC_TILESERVER_STYLE_URL no está configurada"),
    );
  }

  const request = fetch(styleUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Self-hosted basemap responded with ${response.status}`,
        );
      }
      return normalizeSelfHostedStyle(await response.json(), scheme, styleUrl);
    })
    .then((style) => {
      styleCache.set(scheme, style);
      return style;
    })
    .finally(() => pendingStyles.delete(scheme));

  pendingStyles.set(scheme, request);
  return request;
}

const fallbackStyles = new Map<TurismoColorScheme, StyleSpecification>();

/**
 * Si el servidor propio no responde, conservamos los pines y controles sobre
 * un fondo local neutro; no se consulta otro proveedor de mapas. The style is
 * cached per scheme so MapLibre always receives the same object.
 */
export function getFallbackMapStyle(
  scheme: TurismoColorScheme,
): StyleSpecification {
  const cached = fallbackStyles.get(scheme);
  if (cached) return cached;

  const style = {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        paint: {
          "background-color": getTurismoMapColors(scheme).basemapCanvas,
        },
        type: "background",
      },
    ],
  } as unknown as StyleSpecification;
  fallbackStyles.set(scheme, style);
  return style;
}

export function normalizeSelfHostedStyle(
  value: unknown,
  scheme: TurismoColorScheme,
  styleUrl: string,
): StyleSpecification {
  if (!isRecord(value)) {
    throw new Error("The self-hosted basemap returned an invalid style");
  }

  const sources = value.sources;
  if (!isRecord(sources)) {
    throw new Error("The self-hosted basemap style has no sources");
  }

  const tileJsonUrl = new URL("/data/v3.json", styleUrl).toString();
  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => {
      if (!isRecord(source)) return [sourceId, source];
      const normalizedSource = { ...source };
      const sourceUrl =
        typeof normalizedSource.url === "string"
          ? new URL(normalizedSource.url, styleUrl).toString()
          : undefined;
      if (sourceUrl === tileJsonUrl) {
        // Conservar el TileJSON permite que MapLibre resuelva el template de
        // tiles y sus metadatos exactamente como los publica TileServer GL.
        // Ecuador se generó hasta z14; se declara para evitar solicitudes
        // innecesarias a niveles superiores.
        normalizedSource.url = sourceUrl;
        normalizedSource.maxzoom = 14;
        delete normalizedSource.tiles;
      }
      if (sourceId === "openmaptiles") {
        normalizedSource.attribution =
          "© OpenMapTiles © OpenStreetMap contributors";
      }
      return [sourceId, normalizedSource];
    }),
  );

  return {
    ...value,
    layers: quietMapLayers(value.layers, scheme),
    sources: normalizedSources,
  } as unknown as StyleSpecification;
}

function quietMapLayers(value: unknown, scheme: TurismoColorScheme): unknown {
  if (!Array.isArray(value)) return value;

  const dark = scheme === "dark";
  const palette = basemapPalettes[scheme];

  return value.map((layer: unknown) => {
    if (!isRecord(layer)) return layer;

    const layerName = [layer.id, layer["source-layer"]]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .toLowerCase();
    const paint = isRecord(layer.paint) ? layer.paint : {};
    const layout = isRecord(layer.layout) ? layer.layout : {};

    if (layer.type === "background") {
      return {
        ...layer,
        paint: { ...paint, "background-color": palette.background },
      };
    }

    if (layer.type === "fill" || layer.type === "fill-extrusion") {
      const fillRule = basemapFillRules.find(({ pattern }) =>
        pattern.test(layerName),
      );
      const fillColor = palette[fillRule?.color ?? "landuse"];
      const isBuildingLayer = fillRule?.color === "building";
      const isNaturalLayer = basemapFillRules.some(
        ({ color, pattern }) =>
          naturalFillColors.has(color) && pattern.test(layerName),
      );
      const fillOpacity = isBuildingLayer
        ? dark
          ? 0.86
          : 0.9
        : isNaturalLayer
          ? dark
            ? 0.88
            : 0.82
          : dark
            ? 0.86
            : 0.78;
      return {
        ...layer,
        paint: {
          ...paint,
          ...(layer.type === "fill"
            ? {
                "fill-color": fillColor,
                "fill-opacity": fillOpacity,
                "fill-outline-color": "transparent",
              }
            : {
                "fill-extrusion-color": fillColor,
                "fill-extrusion-opacity": isBuildingLayer ? 0.78 : 0.9,
              }),
        },
      };
    }

    if (layer.type === "symbol") {
      return {
        ...layer,
        layout: {
          ...layout,
          // El estilo publicado todavía declara Open Sans, pero el endpoint de
          // glifos del TileServer solo publica Noto Sans. Normalizarlo evita
          // respuestas 400 y mantiene disponibles las etiquetas del mapa.
          ...(layout["text-font"]
            ? { "text-font": ["Noto Sans Regular"] }
            : {}),
        },
        paint: {
          ...paint,
          ...(paint["text-color"]
            ? {
                "text-color": palette.text,
                "text-halo-color": palette.textHalo,
                "text-halo-width": 1,
              }
            : {}),
        },
      };
    }

    if (layer.type !== "line") return layer;

    if (/waterway/.test(layerName)) {
      return {
        ...layer,
        paint: {
          ...paint,
          "line-color": palette.waterLine,
          "line-opacity": dark ? 0.7 : 0.82,
        },
      };
    }

    const isRoadLayer =
      /road|street|highway|motorway|trunk|arterial|expressway|transportation/.test(
        layerName,
      );
    if (!isRoadLayer) return layer;

    if (/casing|outline|border|stroke|halo|shadow/.test(layerName)) {
      return { ...layer, layout: { ...layout, visibility: "none" } };
    }

    const isMajorRoad = /trunk|primary|major|motorway/.test(layerName);
    return {
      ...layer,
      paint: {
        ...paint,
        "line-color": isMajorRoad ? palette.roadMajor : palette.roadMinor,
        "line-opacity": isMajorRoad ? (dark ? 0.84 : 0.88) : dark ? 0.68 : 0.74,
      },
    };
  });
}

const naturalFillColors: ReadonlySet<string> = new Set([
  "grass",
  "park",
  "water",
  "wood",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
