import type {
  CameraRef,
  FilterSpecification,
  GeoJSONSourceRef,
  VectorSourceRef,
} from "@maplibre/maplibre-react-native";

import { getDistanceMeters, offsetCoordinate } from "@/core/geo/distance";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { EstablishmentMapGroup } from "@/features/establishments/domain/establishment-groups";
import {
  establishmentTileLayer,
  parseEstablishmentTileFeature,
} from "@/features/establishments/data/establishment-tiles";
import { mapPlaceZoom } from "../domain/map-place-priority";
import {
  getMapFeatureCoordinate,
  getNearbyMapFeatureSelections,
  nearbyMapFeatureRadiusMeters,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";
import {
  focusCameraDurationMs,
  focusZoom,
  maxMapZoom,
  noPadding,
} from "./center-map-camera";
import type { CenterMapProps, LocalMapPlace } from "./center-map.types";

/** Clusters up to this size open the choices when all points share a spot. */
const stackedClusterLimit = 50;

/** Pressable map sources; each one gets its own chain of press steps. */
export type MapPressSource =
  "local" | "centers" | "establishments" | "selection";
export type MapEaseToOptions = Parameters<CameraRef["easeTo"]>[0];
export type ClusterSource = Pick<
  GeoJSONSourceRef,
  "getClusterExpansionZoom" | "getClusterLeaves"
>;
export type TileSource = Pick<VectorSourceRef, "querySourceFeatures">;
/** Chip filter of the registry layer, narrow enough to spread into another filter. */
export type EstablishmentGroupFilter = [
  "==",
  ["get", "group"],
  EstablishmentMapGroup,
];

export type MapFeaturePressContext = Readonly<{
  source: MapPressSource;
  /** Pins under the finger, as MapLibre reports them (hitbox included). */
  features: readonly GeoJSON.Feature[];
  clusterSource: ClusterSource | null;
  establishmentsSource: TileSource | null;
  centers: readonly PublicCenter[];
  centersByCode: ReadonlyMap<string, PublicCenter>;
  localPlaces: readonly LocalMapPlace[] | undefined;
  establishmentLayer: CenterMapProps["establishmentLayer"];
  establishmentGroupFilter: EstablishmentGroupFilter | undefined;
  /** True once a newer press, a gesture or the unmount made this press obsolete. */
  isStale: () => boolean;
  easeTo: (options: MapEaseToOptions) => void;
  /** Centers the pin above the sheet at the focus zoom. */
  focusCamera: (target: [number, number]) => void;
  /** Opens the sheet for one selection, or the choices for several. */
  deliverSelections: (selections: readonly MapFeatureSelection[]) => void;
  onLocalPlacePress: CenterMapProps["onLocalPlacePress"];
  onLocalPlacesPress: CenterMapProps["onLocalPlacesPress"];
}>;

/** A press step returns true when it consumed the press. */
type PressStep = (context: MapFeaturePressContext) => boolean;

function focusSelections(
  context: MapFeaturePressContext,
  selections: readonly MapFeatureSelection[],
  target: [number, number],
): void {
  context.deliverSelections(selections);
  context.focusCamera(target);
}

/** Zooms into a cluster, or opens the list when its leaves share a spot. */
const pressCluster: PressStep = (context) => {
  const { clusterSource, features, isStale, source } = context;
  const cluster = features.find(
    (feature) =>
      typeof feature.properties?.cluster_id === "number" &&
      feature.geometry?.type === "Point",
  );
  if (cluster?.geometry.type !== "Point" || !clusterSource) return false;
  const [longitude, latitude] = cluster.geometry.coordinates;
  if (longitude === undefined || latitude === undefined) return true;
  const minimumZoom =
    source === "local"
      ? mapPlaceZoom.establishmentIcon
      : mapPlaceZoom.centerIcon;
  const expandCluster = (zoom: number) => {
    if (isStale()) return;
    context.easeTo({
      center: [longitude, latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: Math.min(maxMapZoom, Math.max(minimumZoom, zoom)),
    });
  };
  const clusterId = cluster.properties?.cluster_id as number;
  // Lugares en la misma coordenada no se separan al acercar: el pin de
  // arriba taparía al resto. Se abre la lista en lugar de hacer zoom.
  const openStackedLeaves = (leaves: GeoJSON.Feature[]) => {
    const points = leaves.flatMap((leaf) => {
      if (leaf.geometry?.type !== "Point") return [];
      const [lng, lat] = leaf.geometry.coordinates;
      return lng === undefined || lat === undefined
        ? []
        : [{ leaf, latitude: lat, longitude: lng }];
    });
    const [first] = points;
    if (
      !first ||
      points.length !== leaves.length ||
      points.some(
        (point) =>
          getDistanceMeters(first, point) > nearbyMapFeatureRadiusMeters,
      )
    )
      return false;
    if (source === "local") {
      const keys = leaves.flatMap((leaf) =>
        typeof leaf.properties?.offlineKey === "string"
          ? [leaf.properties.offlineKey]
          : [],
      );
      if (keys.length < 2 || !context.onLocalPlacesPress) return false;
      context.focusCamera([first.longitude, first.latitude]);
      context.onLocalPlacesPress(keys);
      return true;
    }
    const stacked = leaves.flatMap<MapFeatureSelection>((leaf) => {
      const code = leaf.properties?.code;
      const center =
        typeof code === "string" ? context.centersByCode.get(code) : undefined;
      return center ? [{ kind: "center", center }] : [];
    });
    if (stacked.length < 2) return false;
    focusSelections(context, stacked, [first.longitude, first.latitude]);
    return true;
  };
  void clusterSource
    .getClusterLeaves(clusterId, stackedClusterLimit + 1, 0)
    .then((leaves) => {
      if (isStale()) return;
      if (leaves.length <= stackedClusterLimit && openStackedLeaves(leaves))
        return;
      return clusterSource
        .getClusterExpansionZoom(clusterId)
        .then(expandCluster);
    })
    .catch(() => expandCluster(minimumZoom));
  return true;
};

/** Pins of a downloaded city: opens one place or the nearby group. */
const pressLocalPlaces: PressStep = (context) => {
  const { features, localPlaces, onLocalPlacePress, onLocalPlacesPress } =
    context;
  const localKeys = [
    ...new Set(
      features.flatMap((feature) =>
        typeof feature.properties?.offlineKey === "string"
          ? [feature.properties.offlineKey]
          : [],
      ),
    ),
  ];
  if (localKeys.length > 1 && onLocalPlacesPress) {
    onLocalPlacesPress(localKeys);
    return true;
  }
  const [localKey] = localKeys;
  if (typeof localKey !== "string") return false;
  const place = localPlaces?.find((item) => item.key === localKey);
  if (place) {
    const nearbyKeys = (localPlaces ?? [])
      .filter(
        (item) =>
          getDistanceMeters(place, item) <= nearbyMapFeatureRadiusMeters,
      )
      .map((item) => item.key);
    context.easeTo({
      center: [place.longitude, place.latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: focusZoom,
    });
    if (nearbyKeys.length > 1 && onLocalPlacesPress)
      onLocalPlacesPress([
        localKey,
        ...nearbyKeys.filter((key) => key !== localKey),
      ]);
    else onLocalPlacePress?.(localKey);
  }
  return true;
};

function getNearbyQueryFilter(
  [longitude, latitude]: [number, number],
  groupFilter: EstablishmentGroupFilter | undefined,
): FilterSpecification {
  const coordinate = { latitude, longitude };
  const radius = nearbyMapFeatureRadiusMeters;
  const filter: FilterSpecification = [
    "all",
    ...(groupFilter ? [groupFilter] : []),
    [
      ">=",
      ["get", "latitude"],
      offsetCoordinate(coordinate, radius, 180).latitude,
    ],
    [
      "<=",
      ["get", "latitude"],
      offsetCoordinate(coordinate, radius, 0).latitude,
    ],
    [
      ">=",
      ["get", "longitude"],
      offsetCoordinate(coordinate, radius, 270).longitude,
    ],
    [
      "<=",
      ["get", "longitude"],
      offsetCoordinate(coordinate, radius, 90).longitude,
    ],
  ];
  return filter;
}

/** Centers and registry pins: opens the ficha or the nearby choices. */
const pressSelections: PressStep = (context) => {
  const { centers, centersByCode, features, isStale } = context;
  const pressed = features.flatMap<MapFeatureSelection>((feature) => {
    const code = feature.properties?.code;
    const center =
      typeof code === "string" ? centersByCode.get(code) : undefined;
    if (center) return [{ kind: "center", center }];
    const establishment = parseEstablishmentTileFeature(feature.properties);
    return establishment ? [{ kind: "establishment", establishment }] : [];
  });
  const [anchor] = pressed;
  if (!anchor) {
    // Un punto agregado del mapa alejado: se acerca hasta ver sus pines.
    const cell = features.find((feature) => feature.geometry?.type === "Point");
    if (cell?.geometry?.type !== "Point") return true;
    const [longitude, latitude] = cell.geometry.coordinates;
    if (longitude === undefined || latitude === undefined) return true;
    context.easeTo({
      center: [longitude, latitude],
      duration: focusCameraDurationMs,
      padding: noPadding,
      zoom: mapPlaceZoom.establishmentIcon,
    });
    return true;
  }
  const pressedEstablishments = pressed.flatMap((selection) =>
    selection.kind === "establishment" ? [selection.establishment] : [],
  );
  const selections = getNearbyMapFeatureSelections(
    anchor,
    centers,
    pressedEstablishments,
  );
  const target = getMapFeatureCoordinate(anchor);
  // Points hidden by native collision are not in the press event. When
  // only one was hit, read the loaded MVT tiles first so the ficha or the
  // choices open once, instead of swapping the sheet afterwards. The query
  // never makes a registry request.
  if (
    !context.establishmentLayer.visible ||
    context.localPlaces !== undefined ||
    selections.length !== 1
  ) {
    focusSelections(context, selections, target);
    return true;
  }
  context.focusCamera(target);
  void context.establishmentsSource
    ?.querySourceFeatures({
      sourceLayer: establishmentTileLayer,
      filter: getNearbyQueryFilter(target, context.establishmentGroupFilter),
    })
    .then((loaded) => {
      if (isStale()) return;
      const nearby = getNearbyMapFeatureSelections(anchor, centers, [
        ...pressedEstablishments,
        ...loaded.flatMap((feature) => {
          const establishment = parseEstablishmentTileFeature(
            feature.properties,
          );
          return establishment ? [establishment] : [];
        }),
      ]);
      context.deliverSelections(
        nearby.length > selections.length ? nearby : selections,
      );
    })
    .catch(() => {
      if (isStale()) return;
      context.deliverSelections(selections);
    });
  return true;
};

const pressStepsBySource: Readonly<
  Record<MapPressSource, readonly PressStep[]>
> = {
  local: [pressCluster, pressLocalPlaces, pressSelections],
  centers: [pressCluster, pressSelections],
  establishments: [pressSelections],
  selection: [pressSelections],
};

/**
 * Resolves a press on a map source. The event already carries the pins under
 * the finger, so no asynchronous map query is needed before focusing; the
 * registry pins come from the tiles with their ficha data and related places
 * are filtered afterwards by geographic distance.
 */
export function handleMapFeaturePress(context: MapFeaturePressContext): void {
  for (const step of pressStepsBySource[context.source]) {
    if (step(context)) return;
  }
}

/** Features of a MapLibre press event, or none when the payload is malformed. */
export function readPressFeatures(event: unknown): readonly GeoJSON.Feature[] {
  const features = (
    event as { nativeEvent?: { features?: unknown } } | undefined
  )?.nativeEvent?.features;
  return Array.isArray(features) ? (features as GeoJSON.Feature[]) : [];
}
