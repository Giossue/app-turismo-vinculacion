/**
 * Relleno de cada pin en el tema oscuro: el mismo tono del color de categoría,
 * aclarado hasta contrastar con el terreno sin necesidad de borde. Las imágenes
 * de `establishment-pins-dark/` usan estos colores.
 */
export const establishmentPinDarkColors = {
  "accommodation-hotel": "#906d49",
  "amenity-cinema": "#9b4ae1",
  "amenity-library": "#5b7498",
  "amenity-toilets": "#64748b",
  "eat-drink-cafe": "#9a683a",
  "eat-drink-restaurant": "#bb5609",
  "health-hospital": "#e11a51",
  "money-atm": "#61748f",
  "money-bank": "#627491",
  "outdoor-camping": "#528018",
  "outdoor-drinking-water": "#108179",
  "religious-place-of-worship": "#8a53e1",
  "shop-supermarket": "#e11547",
  "tourism-information": "#0379ba",
  "tourism-museum": "#8a53e0",
  "tourism-viewpoint": "#a66507",
  "transport-bus-stop": "#1c7c9a",
} as const satisfies Record<string, string>;
