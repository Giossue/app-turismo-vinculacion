/**
 * Contraste WCAG 2.x entre dos colores hexadecimales opacos (`#rrggbb`).
 * Las pruebas de tokens lo usan para que la paleta no baje del mínimo AA.
 */
export function getContrastRatio(foreground: string, background: string) {
  const first = getRelativeLuminance(foreground);
  const second = getRelativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function getRelativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Color no admitido: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  const [red, green, blue] = [value >> 16, (value >> 8) & 255, value & 255].map(
    (channel) => {
      const srgb = channel / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    },
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
