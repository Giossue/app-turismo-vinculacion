import { describe, expect, it } from "vitest";

import {
  getCenterHierarchyRank,
  getCenterMapPriority,
  mapPlaceZoom,
} from "./map-place-priority";

const focus = { latitude: -1.59263, longitude: -79.00098 };
const center = { ...focus, hierarchyCode: null, hierarchy: null };

describe("map place priority", () => {
  it("reveals attractions and their names before services", () => {
    expect(mapPlaceZoom.centerIcon).toBeLessThan(
      mapPlaceZoom.establishmentIcon,
    );
    expect(mapPlaceZoom.centerName).toBeLessThan(
      mapPlaceZoom.establishmentName,
    );
    expect(mapPlaceZoom.centerIcon).toBeLessThanOrEqual(
      mapPlaceZoom.centerName,
    );
    expect(mapPlaceZoom.establishmentIcon).toBeLessThanOrEqual(
      mapPlaceZoom.establishmentName,
    );
  });

  it("uses the published hierarchy, including its Roman label fallback", () => {
    expect(
      getCenterHierarchyRank({ hierarchyCode: "03", hierarchy: "III" }),
    ).toBe(3);
    expect(
      getCenterHierarchyRank({ hierarchyCode: null, hierarchy: " IV " }),
    ).toBe(4);
    expect(
      getCenterHierarchyRank({ hierarchyCode: "unknown", hierarchy: null }),
    ).toBe(0);
  });

  it("keeps higher hierarchy ahead of a closer ordinary attraction", () => {
    const prominent = { ...center, longitude: -80, hierarchyCode: "03" };
    expect(getCenterMapPriority(prominent, focus)).toBeLessThan(
      getCenterMapPriority(center, focus),
    );
  });

  it("prefers attractions near the viewport center when hierarchy is equal", () => {
    expect(getCenterMapPriority(center, focus)).toBeLessThan(
      getCenterMapPriority({ ...center, longitude: -80 }, focus),
    );
  });
});
