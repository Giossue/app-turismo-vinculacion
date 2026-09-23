import type { EstablishmentMapGroup } from "@/features/establishments/domain/establishment-groups";

/**
 * What the Explore map shows. `null` (no chip selected) shows everything;
 * `tourism` only the tourist centers; `establishments` only one group of the
 * tourism registry.
 */
export type ExploreMapFilter =
  | Readonly<{ kind: "tourism" }>
  | Readonly<{ kind: "establishments"; group: EstablishmentMapGroup }>
  | null;

export function isSameMapFilter(
  a: ExploreMapFilter,
  b: ExploreMapFilter,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  return (
    a.kind === "tourism" || (b.kind === "establishments" && a.group === b.group)
  );
}

/** Tapping the selected chip again clears the filter. */
export function toggleMapFilter(
  current: ExploreMapFilter,
  next: ExploreMapFilter,
): ExploreMapFilter {
  return isSameMapFilter(current, next) ? null : next;
}
