import { describe, expect, it, vi } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import { mapPlaceZoom } from "../domain/map-place-priority";
import { focusZoom } from "./center-map-camera";
import {
  handleMapFeaturePress,
  readPressFeatures,
  type MapFeaturePressContext,
} from "./map-feature-press";

const centerA = {
  code: "A",
  name: "Parque",
  latitude: -1.59,
  longitude: -79,
} as PublicCenter;
const centerB = { ...centerA, code: "B", name: "Iglesia" } as PublicCenter;
const hotel = {
  name: "Hotel",
  category: "alojamiento",
  latitude: -1.5901,
  longitude: -79.0001,
  approximate: false,
  icon: "hotel",
};

function point(
  properties: GeoJSON.GeoJsonProperties,
  coordinates: [number, number] = [-79, -1.59],
): GeoJSON.Feature {
  return {
    type: "Feature",
    properties,
    geometry: { type: "Point", coordinates },
  };
}

function makeContext(
  overrides: Partial<MapFeaturePressContext>,
): MapFeaturePressContext {
  return {
    source: "centers",
    features: [],
    clusterSource: null,
    establishmentsSource: null,
    centers: [centerA, centerB],
    centersByCode: new Map([
      ["A", centerA],
      ["B", centerB],
    ]),
    localPlaces: undefined,
    establishmentLayer: { visible: true },
    establishmentGroupFilter: undefined,
    isStale: () => false,
    easeTo: vi.fn(),
    focusCamera: vi.fn(),
    deliverSelections: vi.fn(),
    onLocalPlacePress: vi.fn(),
    onLocalPlacesPress: vi.fn(),
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("readPressFeatures", () => {
  it("returns the features of a MapLibre press, or none", () => {
    const feature = point({ code: "A" });
    expect(readPressFeatures({ nativeEvent: { features: [feature] } })).toEqual(
      [feature],
    );
    expect(readPressFeatures({ nativeEvent: {} })).toEqual([]);
    expect(readPressFeatures(undefined)).toEqual([]);
  });
});

describe("handleMapFeaturePress on clusters", () => {
  it("opens the choices when every leaf shares the spot", async () => {
    const context = makeContext({
      features: [point({ cluster_id: 7, point_count: 2 })],
      clusterSource: {
        getClusterLeaves: vi.fn(async () => [
          point({ code: "A" }),
          point({ code: "B" }),
        ]),
        getClusterExpansionZoom: vi.fn(async () => 17),
      },
    });
    handleMapFeaturePress(context);
    await flush();
    expect(context.deliverSelections).toHaveBeenCalledWith([
      { kind: "center", center: centerA },
      { kind: "center", center: centerB },
    ]);
    expect(context.focusCamera).toHaveBeenCalledWith([-79, -1.59]);
    expect(context.easeTo).not.toHaveBeenCalled();
  });

  it("zooms to the expansion zoom when the leaves spread out", async () => {
    const context = makeContext({
      features: [point({ cluster_id: 7, point_count: 2 })],
      clusterSource: {
        getClusterLeaves: vi.fn(async () => [
          point({ code: "A" }),
          point({ code: "B" }, [-78.9, -1.5]),
        ]),
        getClusterExpansionZoom: vi.fn(async () => 12),
      },
    });
    handleMapFeaturePress(context);
    await flush();
    expect(context.deliverSelections).not.toHaveBeenCalled();
    expect(context.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-79, -1.59],
        zoom: mapPlaceZoom.centerIcon,
      }),
    );
  });

  it("ignores a stale press once the native promise resolves", async () => {
    const context = makeContext({
      features: [point({ cluster_id: 7, point_count: 2 })],
      clusterSource: {
        getClusterLeaves: vi.fn(async () => [point({ code: "A" })]),
        getClusterExpansionZoom: vi.fn(async () => 16),
      },
      isStale: () => true,
    });
    handleMapFeaturePress(context);
    await flush();
    expect(context.deliverSelections).not.toHaveBeenCalled();
    expect(context.easeTo).not.toHaveBeenCalled();
  });
});

describe("handleMapFeaturePress on a downloaded city", () => {
  const plaza = {
    key: "plaza",
    name: "Plaza",
    latitude: -1.59,
    longitude: -79,
    icon: "park",
  };
  const museo = { ...plaza, key: "museo", name: "Museo", latitude: -1.59005 };
  const lejos = { ...plaza, key: "lejos", name: "Lejos", latitude: -1.4 };

  it("opens one place and eases the camera onto it", () => {
    const context = makeContext({
      source: "local",
      features: [point({ offlineKey: "lejos" }, [-79, -1.4])],
      localPlaces: [plaza, museo, lejos],
    });
    handleMapFeaturePress(context);
    expect(context.onLocalPlacePress).toHaveBeenCalledWith("lejos");
    expect(context.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-79, -1.4], zoom: focusZoom }),
    );
  });

  it("groups the pressed place with its neighbours, pressed one first", () => {
    const context = makeContext({
      source: "local",
      features: [point({ offlineKey: "museo" })],
      localPlaces: [plaza, museo, lejos],
    });
    handleMapFeaturePress(context);
    expect(context.onLocalPlacesPress).toHaveBeenCalledWith(["museo", "plaza"]);
    expect(context.onLocalPlacePress).not.toHaveBeenCalled();
  });
});

describe("handleMapFeaturePress on centers and registry pins", () => {
  it("opens the nearby centers without a tile query when local places are shown", () => {
    const context = makeContext({
      features: [point({ code: "A" })],
      localPlaces: [],
    });
    handleMapFeaturePress(context);
    // Both centers share the spot, so the choices open instead of one ficha.
    expect(context.deliverSelections).toHaveBeenCalledWith([
      { kind: "center", center: centerA },
      { kind: "center", center: centerB },
    ]);
    expect(context.focusCamera).toHaveBeenCalledWith([-79, -1.59]);
  });

  it("reads the loaded tiles before opening a lone registry pin", async () => {
    const querySourceFeatures = vi.fn(async () => [
      point({ ...hotel, name: "Hostal" }),
    ]);
    const context = makeContext({
      source: "establishments",
      features: [point(hotel, [hotel.longitude, hotel.latitude])],
      establishmentsSource: { querySourceFeatures },
      centers: [],
    });
    handleMapFeaturePress(context);
    expect(context.focusCamera).toHaveBeenCalledWith([
      hotel.longitude,
      hotel.latitude,
    ]);
    expect(context.deliverSelections).not.toHaveBeenCalled();
    await flush();
    expect(querySourceFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ sourceLayer: "establishments" }),
    );
    const [selections] = vi.mocked(context.deliverSelections).mock.calls[0]!;
    expect(
      selections
        .map((selection) =>
          selection.kind === "establishment"
            ? selection.establishment.name
            : "",
        )
        .sort(),
    ).toEqual(["Hostal", "Hotel"]);
  });

  it("falls back to the pressed pin when the tile query fails", async () => {
    const context = makeContext({
      source: "establishments",
      features: [point(hotel)],
      centers: [],
      establishmentsSource: {
        querySourceFeatures: vi.fn(async () => {
          throw new Error("native");
        }),
      },
    });
    handleMapFeaturePress(context);
    await flush();
    expect(context.deliverSelections).toHaveBeenCalledTimes(1);
  });

  it("zooms into an aggregated cell that carries no pin data", () => {
    const context = makeContext({
      source: "establishments",
      features: [point({ count: 12 }, [-78.9, -1.5])],
    });
    handleMapFeaturePress(context);
    expect(context.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-78.9, -1.5],
        zoom: mapPlaceZoom.establishmentIcon,
      }),
    );
    expect(context.deliverSelections).not.toHaveBeenCalled();
  });
});
