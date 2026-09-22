/** Formats an average rating with one decimal and a comma, e.g. `4,3`. */
export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Formats an admission price range as `$5.00` or `$2.50 – $5.00`. */
export function formatAdmissionPrice(
  from: number | null,
  to: number | null,
): string {
  if (from !== null && to !== null && from !== to) {
    return `$${from.toFixed(2)} – $${to.toFixed(2)}`;
  }
  const value = from ?? to;
  return value === null ? "No registrado" : `$${value.toFixed(2)}`;
}
