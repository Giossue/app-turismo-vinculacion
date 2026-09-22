export const ESTABLISHMENT_VISUAL_ICON_CODES = [
  "accommodation-hotel",
  "amenity-cinema",
  "amenity-library",
  "amenity-toilets",
  "eat-drink-cafe",
  "eat-drink-restaurant",
  "health-hospital",
  "money-atm",
  "money-bank",
  "outdoor-camping",
  "outdoor-drinking-water",
  "religious-place-of-worship",
  "shop-supermarket",
  "tourism-information",
  "tourism-museum",
  "tourism-viewpoint",
  "transport-bus-stop",
] as const;

export type EstablishmentVisualIcon =
  (typeof ESTABLISHMENT_VISUAL_ICON_CODES)[number];

/**
 * Colors are intentionally assigned by pin identity. They are deep enough to
 * remain legible over the current basemap without competing with the green
 * tourist-center pin or the blue current-location marker.
 */
export const ESTABLISHMENT_VISUALS: Readonly<
  Record<EstablishmentVisualIcon, Readonly<{ label: string; color: string }>>
> = {
  "accommodation-hotel": { label: "Hotel", color: "#7a5c3e" },
  "amenity-cinema": { label: "Cine", color: "#7e22ce" },
  "amenity-library": { label: "Biblioteca", color: "#334155" },
  "amenity-toilets": { label: "Baños", color: "#64748b" },
  "eat-drink-cafe": { label: "Cafetería", color: "#8b5e34" },
  "eat-drink-restaurant": { label: "Restaurante", color: "#b45309" },
  "health-hospital": { label: "Salud", color: "#9f1239" },
  "money-atm": { label: "Cajero", color: "#475569" },
  "money-bank": { label: "Banco", color: "#374151" },
  "outdoor-camping": { label: "Camping", color: "#3f6212" },
  "outdoor-drinking-water": { label: "Agua potable", color: "#0f766e" },
  "religious-place-of-worship": {
    label: "Lugar de culto",
    color: "#6d28d9",
  },
  "shop-supermarket": { label: "Supermercado", color: "#be123c" },
  "tourism-information": {
    label: "Información turística",
    color: "#0369a1",
  },
  "tourism-museum": { label: "Museo", color: "#5b21b6" },
  "tourism-viewpoint": { label: "Mirador", color: "#a16207" },
  "transport-bus-stop": { label: "Parada de bus", color: "#155e75" },
};

export const DEFAULT_ESTABLISHMENT_VISUAL_ICON: EstablishmentVisualIcon =
  "shop-supermarket";

export function getEstablishmentVisualColor(
  icon: string | null | undefined,
): string {
  return (
    ESTABLISHMENT_VISUALS[icon as EstablishmentVisualIcon]?.color ??
    ESTABLISHMENT_VISUALS[DEFAULT_ESTABLISHMENT_VISUAL_ICON].color
  );
}
