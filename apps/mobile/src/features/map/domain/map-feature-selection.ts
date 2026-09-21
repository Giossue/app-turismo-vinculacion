import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";

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

export const nearbyMapFeatureRadiusMeters = 50;

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
  const [anchorLongitude, anchorLatitude] = getMapFeatureCoordinate(anchor);
  const candidates: {
    distanceMeters: number;
    selection: MapFeatureSelection;
  }[] = [
    ...centers.map((center) => ({
      distanceMeters: distanceBetweenCoordinatesMeters(
        anchorLatitude,
        anchorLongitude,
        center.latitude,
        center.longitude,
      ),
      selection: { kind: "center" as const, center },
    })),
    ...establishments.map((establishment) => ({
      distanceMeters: distanceBetweenCoordinatesMeters(
        anchorLatitude,
        anchorLongitude,
        establishment.latitude,
        establishment.longitude,
      ),
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
    return left.establishment === right.establishment;
  }
  return false;
}

function distanceBetweenCoordinatesMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = degreesToRadians(latitudeB - latitudeA);
  const longitudeDelta = degreesToRadians(longitudeB - longitudeA);
  const latitudeARadians = degreesToRadians(latitudeA);
  const latitudeBRadians = degreesToRadians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
