import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import {
  buildCenterFeatures,
  buildCentersByCode,
  buildLocalFeatures,
  buildLocalRouteFeature,
  buildSelectedFeatures,
} from "./center-map-features";

function makeCenter(overrides: Partial<PublicCenter>): PublicCenter {
  return {
    code: "C1",
    name: "Centro",
    description: null,
    latitude: -1.59,
    longitude: -79,
    category: "",
    type: "",
    subtype: "",
    hierarchy: null,
    categoryCode: "",
    typeCode: "",
    subtypeCode: "",
    provinceCode: "",
    cantonCode: "",
    parishCode: "",
    hierarchyCode: null,
    ...overrides,
  };
}

const viewportCenter = { latitude: -1.59, longitude: -79 };
const near = makeCenter({ code: "NEAR", hierarchyCode: "02" });
const far = makeCenter({
  code: "FAR",
  latitude: -1.2,
  longitude: -78.5,
  hierarchyCode: "02",
});
const top = makeCenter({ code: "TOP", hierarchyCode: "04", latitude: -1.3 });
const establishment: PublicMapEstablishment = {
  name: "Hotel",
  category: "alojamiento",
  latitude: -1.6,
  longitude: -79.1,
  approximate: false,
  icon: "hotel",
};

describe("buildCentersByCode", () => {
  it("indexes the list and keeps a selected center missing from it", () => {
    const byCode = buildCentersByCode([near], {
      kind: "center",
      center: far,
    });
    expect([...byCode.keys()]).toEqual(["NEAR", "FAR"]);
    expect(byCode.get("FAR")).toBe(far);
  });
});

describe("buildCenterFeatures", () => {
  it("maps every center to a point with its hierarchy and priority", () => {
    const collection = buildCenterFeatures([near, far], null, viewportCenter);
    expect(collection.features.map((feature) => feature.id)).toEqual([
      "NEAR",
      "FAR",
    ]);
    const [first] = collection.features;
    expect(first?.properties).toMatchObject({
      code: "NEAR",
      name: "Centro",
      hierarchyRank: 2,
    });
    expect(first?.geometry).toEqual({
      type: "Point",
      coordinates: [-79, -1.59],
    });
  });

  it("ranks hierarchy first and proximity to the viewport second", () => {
    const priorities = Object.fromEntries(
      buildCenterFeatures([near, far, top], null, viewportCenter).features.map(
        (feature) => [feature.properties.code, feature.properties.priority],
      ),
    );
    expect(priorities.TOP).toBeLessThan(priorities.NEAR!);
    expect(priorities.NEAR).toBeLessThan(priorities.FAR!);
  });

  it("leaves the selected center out so its own source draws it", () => {
    const collection = buildCenterFeatures(
      [near, far],
      { kind: "center", center: near },
      viewportCenter,
    );
    expect(collection.features.map((feature) => feature.id)).toEqual(["FAR"]);
    expect(
      buildCenterFeatures(
        [near],
        { kind: "establishment", establishment },
        viewportCenter,
      ).features,
    ).toHaveLength(1);
  });
});

describe("buildLocalFeatures", () => {
  it("builds offline pins keyed by place and an empty list without places", () => {
    expect(buildLocalFeatures(undefined).features).toEqual([]);
    const [feature] = buildLocalFeatures([
      {
        key: "p1",
        name: "Plaza",
        latitude: -1.5,
        longitude: -79.2,
        icon: "park",
      },
    ]).features;
    expect(feature).toEqual({
      type: "Feature",
      id: "p1",
      properties: { offlineKey: "p1", icon: "park", name: "Plaza" },
      geometry: { type: "Point", coordinates: [-79.2, -1.5] },
    });
  });
});

describe("buildSelectedFeatures", () => {
  it("is empty without a selection", () => {
    expect(buildSelectedFeatures(null).features).toEqual([]);
  });

  it("flags a center and keeps the establishment data for its pin", () => {
    const [center] = buildSelectedFeatures({
      kind: "center",
      center: near,
    }).features;
    expect(center?.properties).toEqual({
      code: "NEAR",
      name: "Centro",
      isCenter: true,
    });
    expect(center?.geometry.coordinates).toEqual([-79, -1.59]);
    const [pin] = buildSelectedFeatures({
      kind: "establishment",
      establishment,
    }).features;
    expect(pin?.properties).toEqual({ ...establishment, isCenter: false });
    expect(pin?.geometry.coordinates).toEqual([-79.1, -1.6]);
  });
});

describe("buildLocalRouteFeature", () => {
  it("wraps the published line or stays empty", () => {
    expect(buildLocalRouteFeature(null).features).toEqual([]);
    const line: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [-79, -1.5],
        [-79.1, -1.6],
      ],
    };
    expect(buildLocalRouteFeature(line).features).toEqual([
      { type: "Feature", geometry: line, properties: {} },
    ]);
  });
});
