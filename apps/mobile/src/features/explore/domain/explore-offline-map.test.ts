import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import { buildExploreOfflineMap } from "./explore-offline-map";

const center = {
  code: "C1",
  name: "Museo",
  latitude: -2.1,
  longitude: -79.9,
} as PublicCenter;

const establishment = (name: string, group: string) => ({
  name,
  category: "food",
  categoryLabel: "Comida",
  latitude: -2.2,
  longitude: -79.8,
  approximate: false,
  icon: "restaurant",
  group,
  activity: "Alimentos",
  classification: null,
  address: null,
  phone: null,
  localityName: "Centro",
});

const lightStyle = { version: 8, sources: {}, layers: [] } as const;

const manifest = {
  city: { slug: "gye", name: "Guayaquil" },
  centers: [center],
  establishments: [
    establishment("Café Uno", "cafes"),
    establishment("Bar Dos", "bars"),
  ],
  pois: [
    {
      key: "p1",
      name: "Mirador",
      description: null,
      category: null,
      latitude: -2.3,
      longitude: -79.7,
      icon: "viewpoint",
    },
  ],
  download: { mapStyles: { light: lightStyle, dark: lightStyle } },
} as unknown as OfflineCityManifest;

describe("buildExploreOfflineMap", () => {
  it("returns nothing without downloaded cities", () => {
    expect(buildExploreOfflineMap([], null)).toBeNull();
  });

  it("shows centers, establishments and points of interest", () => {
    const map = buildExploreOfflineMap([manifest], null)!;
    expect(map.centers).toEqual([center]);
    expect(map.places.map((place) => place.name)).toEqual([
      "Café Uno",
      "Bar Dos",
      "Mirador",
    ]);
    expect(map.establishments.get(map.places[2]!.key)).toMatchObject({
      name: "Mirador",
      categoryLabel: "Punto de interés",
    });
    expect(map.mapStyles?.light).toBe(lightStyle);
  });

  it("applies the map filter like the online pins", () => {
    expect(
      buildExploreOfflineMap([manifest], { kind: "tourism" })!.places,
    ).toEqual([]);
    const cafes = buildExploreOfflineMap([manifest], {
      kind: "establishments",
      group: "cafes",
    })!;
    expect(cafes.centers).toEqual([]);
    expect(cafes.places.map((place) => place.name)).toEqual(["Café Uno"]);
  });

  it("does not repeat places shared by two downloaded cities", () => {
    const map = buildExploreOfflineMap([manifest, manifest], null)!;
    expect(map.places).toHaveLength(3);
    expect(map.centers).toHaveLength(1);
  });
});
