import { getDistanceMeters } from "@/core/geo/distance";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  getEstablishmentKey,
  type PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";

export type MapFeatureSelection = Readonly<
  | {
      kind: "center";
      center: PublicCenter;
    }
  | {
      kind: "establishment";
      establishment: PublicMapEstablishment;
    }
>;

const nearbyMapFeatureRadiusMeters = 50;

export function getMapFeatureCoordinate(
  selection: MapFeatureSelection,
): readonly [number, number] {
  return selection.kind === "center"
    ? [selection.center.longitude, selection.center.latitude]
    : [selection.establishment.longitude, selection.establishment.latitude];
}

export function getNearbyMapFeatureSelections(
  anchor: MapFeatureSelection,
  centers: readonly PublicCenter[],
  establishments: readonly PublicMapEstablishment[],
  radiusMeters = nearbyMapFeatureRadiusMeters,
): readonly MapFeatureSelection[] {
  const [longitude, latitude] = getMapFeatureCoordinate(anchor);
  const anchorCoordinate = { latitude, longitude };
  const candidates: {
    distanceMeters: number;
    selection: MapFeatureSelection;
  }[] = [
    ...centers.map((center) => ({
      distanceMeters: getDistanceMeters(anchorCoordinate, center),
      selection: { kind: "center" as const, center },
    })),
    ...establishments.map((establishment) => ({
      distanceMeters: getDistanceMeters(anchorCoordinate, establishment),
      selection: { kind: "establishment" as const, establishment },
    })),
  ];

  return candidates
    .filter(({ distanceMeters }) => distanceMeters <= radiusMeters)
    .sort((left, right) => {
      const leftIsAnchor = isSameMapFeature(left.selection, anchor);
      const rightIsAnchor = isSameMapFeature(right.selection, anchor);
      if (leftIsAnchor !== rightIsAnchor) return leftIsAnchor ? -1 : 1;
      return left.distanceMeters - right.distanceMeters;
    })
    .map(({ selection }) =>
      isSameMapFeature(selection, anchor) ? anchor : selection,
    );
}

function isSameMapFeature(
  left: MapFeatureSelection,
  right: MapFeatureSelection,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "center" && right.kind === "center") {
    return left.center.code === right.center.code;
  }
  if (left.kind === "establishment" && right.kind === "establishment") {
    return (
      getEstablishmentKey(left.establishment) ===
      getEstablishmentKey(right.establishment)
    );
  }
  return false;
}
