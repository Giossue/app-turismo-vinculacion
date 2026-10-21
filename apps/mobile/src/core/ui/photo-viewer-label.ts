import { messages } from "@/core/i18n/language";

/** Etiqueta para el lector de pantalla: descripción y posición en la galería. */
export function describeViewerPhoto(
  description: string | null | undefined,
  position: number,
  total: number,
): string {
  const text = messages().core.photo;
  const label = description?.trim() || text.defaultLabel;
  return total > 1 ? `${label}. ${text.position(position + 1, total)}` : label;
}
