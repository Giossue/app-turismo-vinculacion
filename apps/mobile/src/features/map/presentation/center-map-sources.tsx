import {
  type CircleLayerSpecification,
  type FilterSpecification,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  type PressEventWithFeatures,
  VectorSource,
  type VectorSourceRef,
} from "@maplibre/maplibre-react-native";
import type { Ref } from "react";
import type { NativeSyntheticEvent } from "react-native";

import type { useTurismoMapPalette } from "@/core/ui/theme-context";
import { turismoMapLayerStyle } from "@/core/ui/tokens";
import {
  establishmentTileLayer,
  establishmentTileMaxZoom,
} from "@/features/establishments/data/establishment-tiles";
import {
  establishmentPinColorExpression,
  establishmentPinImageExpression,
  establishmentPinImages,
} from "@/features/establishments/presentation/establishment-pins";
import { mapPlaceZoom } from "../domain/map-place-priority";
import type {
  CenterFeatureCollection,
  PointFeatureCollection,
} from "./center-map-features";
import type { CenterMapLabelStyles } from "./center-map-label-styles";
import { mapPinLayout } from "./map-symbol-layout";

type MapColors = ReturnType<typeof useTurismoMapPalette>;
type CirclePaint = NonNullable<CircleLayerSpecification["paint"]>;
type SourcePressHandler = (
  event: NativeSyntheticEvent<PressEventWithFeatures>,
) => void;

export const mapImages = {
  ...establishmentPinImages,
  "tourism-center-monument-dark": require("../../../../assets/images/tourism-center-monument-dark.png"),
  "tourism-center-monument-light": require("../../../../assets/images/tourism-center-monument-light.png"),
};

export const layerIds = {
  centerDots: "tourism-center-dots",
  centerIcons: "tourism-center-icons",
  centerClusters: "tourism-center-clusters",
  centerClusterNames: "tourism-center-cluster-names",
  establishmentDots: "tourism-establishment-dots",
  establishmentPins: "tourism-establishment-pins",
} as const;

/** A bit larger than a registry dot: centers are the main attractions. */
const dotRadius = 5.5;
/** Establishment dots grow with the registry count of their cell. */
const establishmentDotRadius = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "count"], 1],
  1,
  3.5,
  100,
  9,
] satisfies CirclePaint["circle-radius"];
const featureHitbox = { bottom: 22, left: 22, right: 22, top: 22 };
const unclusteredFilter = [
  "!",
  ["has", "point_count"],
] satisfies FilterSpecification;
const clusterFilter = ["has", "point_count"] satisfies FilterSpecification;

function getClusterPaint(colors: MapColors): CirclePaint {
  return {
    "circle-color": colors.primary,
    "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 50, 21],
    "circle-stroke-color": colors.surface,
    "circle-stroke-width": 1,
  };
}

export function LocalRouteSource({
  colors,
  data,
}: Readonly<{
  colors: MapColors;
  data: GeoJSON.FeatureCollection<GeoJSON.LineString>;
}>) {
  return (
    <GeoJSONSource
      key="tourism-offline-route-source"
      data={data}
      id="tourism-offline-route-source"
    >
      <Layer
        key="tourism-offline-route-line"
        id="tourism-offline-route-line"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": colors.primary, "line-width": 5 }}
      />
    </GeoJSONSource>
  );
}

/** Pins of a downloaded city, clustered by the native engine. */
export function LocalPlacesSource({
  colors,
  data,
  labels,
  onPress,
  ref,
}: Readonly<{
  colors: MapColors;
  data: PointFeatureCollection;
  labels: CenterMapLabelStyles;
  onPress: SourcePressHandler;
  ref: Ref<GeoJSONSourceRef>;
}>) {
  return (
    <GeoJSONSource
      key="tourism-offline-places-source"
      data={data}
      cluster
      clusterMaxZoom={mapPlaceZoom.establishmentIcon - 1}
      hitbox={featureHitbox}
      id="tourism-offline-places-source"
      onPress={onPress}
      ref={ref}
    >
      <Layer
        key="tourism-offline-place-clusters"
        id="tourism-offline-place-clusters"
        filter={clusterFilter}
        type="circle"
        paint={getClusterPaint(colors)}
      />
      {labels.clusterNameLayout ? (
        <Layer
          key="tourism-offline-place-cluster-names"
          id="tourism-offline-place-cluster-names"
          filter={clusterFilter}
          type="symbol"
          layout={labels.clusterNameLayout}
          paint={{ "text-color": colors.surface }}
        />
      ) : null}
      <Layer
        key="tourism-offline-place-dots"
        id="tourism-offline-place-dots"
        type="circle"
        filter={unclusteredFilter}
        maxzoom={mapPlaceZoom.establishmentIcon}
        paint={{
          "circle-color": colors.primary,
          "circle-radius": 5,
          "circle-stroke-color": colors.surface,
          "circle-stroke-width": 1,
        }}
      />
      <Layer
        key="tourism-offline-place-pins"
        id="tourism-offline-place-pins"
        type="symbol"
        filter={unclusteredFilter}
        minzoom={mapPlaceZoom.establishmentIcon}
        layout={{
          ...mapPinLayout,
          ...labels.establishmentNameLayout,
          "icon-image": establishmentPinImageExpression,
        }}
        paint={labels.establishmentLabelPaint}
      />
    </GeoJSONSource>
  );
}

/** Registry pins from vector tiles; chips only change the layer filter. */
export function EstablishmentsSource({
  colors,
  filter,
  labels,
  onPress,
  ref,
  tiles,
  visible,
}: Readonly<{
  colors: MapColors;
  filter: FilterSpecification | undefined;
  labels: CenterMapLabelStyles;
  onPress: SourcePressHandler;
  ref: Ref<VectorSourceRef>;
  tiles: string[];
  visible: boolean;
}>) {
  const visibility = visible ? "visible" : "none";
  return (
    <VectorSource
      key="tourism-establishments-source"
      hitbox={featureHitbox}
      id="tourism-establishments-source"
      maxzoom={establishmentTileMaxZoom}
      onPress={onPress}
      ref={ref}
      tiles={tiles}
    >
      <Layer
        key={layerIds.establishmentPins}
        filter={filter}
        id={layerIds.establishmentPins}
        layout={{
          ...mapPinLayout,
          ...labels.establishmentNameLayout,
          "icon-image": establishmentPinImageExpression,
          visibility,
        }}
        minzoom={mapPlaceZoom.establishmentIcon}
        paint={labels.establishmentLabelPaint}
        source-layer={establishmentTileLayer}
        type="symbol"
      />
      <Layer
        key={layerIds.establishmentDots}
        filter={filter}
        id={layerIds.establishmentDots}
        layout={{ visibility }}
        maxzoom={mapPlaceZoom.establishmentIcon}
        paint={{
          "circle-color": establishmentPinColorExpression,
          "circle-opacity": turismoMapLayerStyle.establishmentDotOpacity,
          "circle-radius": establishmentDotRadius,
          "circle-stroke-color": colors.surface,
          "circle-stroke-width": 1,
        }}
        source-layer={establishmentTileLayer}
        type="circle"
      />
    </VectorSource>
  );
}

/** Published centers, clustered; the selected one lives in its own source. */
export function CentersSource({
  colors,
  data,
  labels,
  onPress,
  ref,
}: Readonly<{
  colors: MapColors;
  data: CenterFeatureCollection;
  labels: CenterMapLabelStyles;
  onPress: SourcePressHandler;
  ref: Ref<GeoJSONSourceRef>;
}>) {
  return (
    <GeoJSONSource
      key="tourism-centers-source"
      data={data}
      cluster
      clusterMaxZoom={mapPlaceZoom.centerIcon - 1}
      hitbox={featureHitbox}
      id="tourism-centers-source"
      onPress={onPress}
      ref={ref}
    >
      <Layer
        key={layerIds.centerClusters}
        id={layerIds.centerClusters}
        filter={clusterFilter}
        paint={getClusterPaint(colors)}
        type="circle"
      />
      {labels.clusterNameLayout ? (
        <Layer
          key={layerIds.centerClusterNames}
          id={layerIds.centerClusterNames}
          filter={clusterFilter}
          layout={labels.clusterNameLayout}
          paint={{ "text-color": colors.surface }}
          type="symbol"
        />
      ) : null}
      <Layer
        key={layerIds.centerDots}
        id={layerIds.centerDots}
        filter={unclusteredFilter}
        maxzoom={mapPlaceZoom.centerIcon}
        paint={{
          "circle-color": colors.primary,
          "circle-radius": dotRadius,
          "circle-stroke-color": colors.surface,
          "circle-stroke-width": 1,
        }}
        type="circle"
      />
      <Layer
        key={layerIds.centerIcons}
        id={layerIds.centerIcons}
        filter={unclusteredFilter}
        layout={{
          ...mapPinLayout,
          ...labels.centerNameLayout,
          "symbol-sort-key": ["get", "priority"],
          "icon-image": labels.centerPinImage,
        }}
        minzoom={mapPlaceZoom.centerIcon}
        paint={labels.centerLabelPaint}
        type="symbol"
      />
    </GeoJSONSource>
  );
}

/** The current selection keeps its pin visible without changing its look. */
export function SelectionSource({
  data,
  labels,
  onPress,
}: Readonly<{
  data: PointFeatureCollection;
  labels: CenterMapLabelStyles;
  onPress: SourcePressHandler;
}>) {
  return (
    <GeoJSONSource
      key="tourism-current-selection-source"
      data={data}
      hitbox={featureHitbox}
      id="tourism-current-selection-source"
      onPress={onPress}
    >
      <Layer
        key="tourism-current-selection-pin"
        id="tourism-current-selection-pin"
        type="symbol"
        layout={{
          ...mapPinLayout,
          ...labels.selectedNameLayout,
          // The selection must not hide the neighbours it was chosen from.
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "text-ignore-placement": true,
          "icon-image": [
            "case",
            ["get", "isCenter"],
            labels.centerPinImage,
            establishmentPinImageExpression,
          ],
        }}
        paint={labels.selectedLabelPaint}
      />
    </GeoJSONSource>
  );
}

/** Marcador del lugar geográfico buscado: punto del tema con su nombre. */
export function PlaceMarkerSource({
  colors,
  data,
  labels,
}: Readonly<{
  colors: MapColors;
  data: PointFeatureCollection;
  labels: CenterMapLabelStyles;
}>) {
  return (
    <GeoJSONSource
      key="tourism-place-marker-source"
      data={data}
      id="tourism-place-marker-source"
    >
      <Layer
        key="tourism-place-marker-halo"
        id="tourism-place-marker-halo"
        paint={{ "circle-color": colors.primarySoft, "circle-radius": 16 }}
        type="circle"
      />
      <Layer
        key="tourism-place-marker-dot"
        id="tourism-place-marker-dot"
        paint={{
          "circle-color": colors.primary,
          "circle-radius": 7,
          "circle-stroke-color": colors.surface,
          "circle-stroke-width": 2.5,
        }}
        type="circle"
      />
      <Layer
        key="tourism-place-marker-name"
        id="tourism-place-marker-name"
        layout={{
          ...labels.placeNameLayout,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-optional": false,
        }}
        paint={labels.placeLabelPaint}
        type="symbol"
      />
    </GeoJSONSource>
  );
}
