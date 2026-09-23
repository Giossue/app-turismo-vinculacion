import type { PublicCenter } from "@/features/centers/domain/public-center";

const maxCenterSuggestions = 8;

/**
 * Quick matches for the text being typed: loaded centers whose name,
 * category, type or subtype contain it, ignoring case.
 */
export function getCenterSuggestions(
  centers: readonly PublicCenter[],
  text: string,
  limit = maxCenterSuggestions,
): PublicCenter[] {
  const normalized = text.trim().toLocaleLowerCase();
  if (!normalized) return [];
  return centers
    .filter((center) =>
      `${center.name} ${center.category} ${center.type} ${center.subtype}`
        .toLocaleLowerCase()
        .includes(normalized),
    )
    .slice(0, limit);
}
