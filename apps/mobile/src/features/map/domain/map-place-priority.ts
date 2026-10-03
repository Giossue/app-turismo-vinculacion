import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicCenter } from "@/features/centers/domain/public-center";

export const mapPlaceZoom = {
  centerIcon: 12,
  centerName: 13,
  establishmentIcon: 14,
  establishmentName: 15,
} as const;

const hierarchyRanks: Readonly<Record<string, number>> = {
  "01": 1,
  "02": 2,
  "03": 3,
  "04": 4,
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
};

/** Published institutional hierarchy; missing data never implies prominence. */
export function getCenterHierarchyRank(
  center: Pick<PublicCenter, "hierarchyCode" | "hierarchy">,
): number {
  return (
    hierarchyRanks[center.hierarchyCode ?? ""] ??
    hierarchyRanks[center.hierarchy?.trim().toUpperCase() ?? ""] ??
    0
  );
}

/** Smaller keys win native placement; viewport proximity only breaks hierarchy ties. */
export function getCenterMapPriority(
  center: Pick<
    PublicCenter,
    "hierarchyCode" | "hierarchy" | "latitude" | "longitude"
  >,
  viewportCenter: GeoCoordinate,
): number {
  const latitudeDistance = center.latitude - viewportCenter.latitude;
  const longitudeDistance =
    (center.longitude - viewportCenter.longitude) *
    Math.cos((viewportCenter.latitude * Math.PI) / 180);
  const distance = Math.hypot(latitudeDistance, longitudeDistance);
  return (4 - getCenterHierarchyRank(center)) * 10 + distance / (1 + distance);
}
