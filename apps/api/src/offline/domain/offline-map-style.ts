export type OfflineMapStyle = Readonly<{
  version: 8;
  sources: Readonly<Record<string, Record<string, unknown>>>;
  layers: readonly Readonly<Record<string, unknown>>[];
  [property: string]: unknown;
}>;

/** Match the resource identities used by the mobile renderer and native pack. */
export function normalizeOfflineMapStyle(
  value: unknown,
  styleUrl: string,
): OfflineMapStyle {
  if (
    !isRecord(value) ||
    value.version !== 8 ||
    !isRecord(value.sources) ||
    !Array.isArray(value.layers)
  ) {
    throw new Error("Invalid map style");
  }

  const sources = Object.fromEntries(
    Object.entries(value.sources).map(([id, source]) => {
      if (!isRecord(source) || typeof source.type !== "string") {
        throw new Error("Invalid map source");
      }
      const normalized = { ...source };
      for (const property of ["url", "data"] as const) {
        if (typeof source[property] === "string") {
          normalized[property] = resolvePublicResource(
            source[property],
            styleUrl,
          );
        }
      }
      for (const property of ["tiles", "urls"] as const) {
        if (source[property] !== undefined) {
          if (!Array.isArray(source[property]))
            throw new Error("Invalid map URLs");
          normalized[property] = source[property].map((url: unknown) => {
            if (typeof url !== "string") throw new Error("Invalid map URL");
            return resolvePublicResource(url, styleUrl);
          });
        }
      }
      if (
        typeof normalized.url === "string" &&
        new URL(normalized.url).pathname === "/data/v3.json"
      ) {
        normalized.maxzoom = 14;
        delete normalized.tiles;
      }
      if (id === "openmaptiles") {
        normalized.attribution = "© OpenMapTiles © OpenStreetMap contributors";
      }
      return [id, normalized];
    }),
  );

  const layers = value.layers.map((layer: unknown) => {
    if (
      !isRecord(layer) ||
      typeof layer.id !== "string" ||
      typeof layer.type !== "string"
    ) {
      throw new Error("Invalid map layer");
    }
    const layout = isRecord(layer.layout) ? layer.layout : {};
    return layer.type === "symbol" &&
      (layout["text-font"] !== undefined || layout["text-field"] !== undefined)
      ? { ...layer, layout: { ...layout, "text-font": ["Noto Sans Regular"] } }
      : layer;
  });

  return {
    ...value,
    version: 8,
    sources,
    layers,
    ...(value.glyphs !== undefined
      ? { glyphs: requiredResource(value.glyphs, styleUrl) }
      : {}),
    ...(value.sprite !== undefined
      ? { sprite: normalizeSprite(value.sprite, styleUrl) }
      : {}),
  };
}

function normalizeSprite(value: unknown, styleUrl: string): unknown {
  if (typeof value === "string") return resolvePublicResource(value, styleUrl);
  if (!Array.isArray(value)) throw new Error("Invalid map sprite");
  return value.map((sprite: unknown) => {
    if (!isRecord(sprite) || typeof sprite.id !== "string") {
      throw new Error("Invalid map sprite");
    }
    return { ...sprite, url: requiredResource(sprite.url, styleUrl) };
  });
}

function requiredResource(value: unknown, styleUrl: string): string {
  if (typeof value !== "string") throw new Error("Invalid map resource");
  return resolvePublicResource(value, styleUrl);
}

function resolvePublicResource(value: string, styleUrl: string): string {
  const url = new URL(value, styleUrl);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid map resource protocol");
  }
  return url.toString().replace(/%7B/gi, "{").replace(/%7D/gi, "}");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
