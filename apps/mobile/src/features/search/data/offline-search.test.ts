import { describe, expect, it } from "vitest";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import { getOfflineBrowserItems } from "@/features/offline/presentation/offline-city-browser";
import type { PublicSearchResult } from "../domain/search-result";
import {
  buildSearchSuggestions,
  getOfflineSearchCoverage,
  getOfflineSearchSuggestions,
} from "./offline-search";

const packageInfo = {
  version: 1,
  checksumSha256: null,
  zoomMin: 8,
  zoomMax: 14,
  publishedAt: null,
};
const manifest: OfflineCityManifest = {
  city: {
    slug: "guaranda",
    name: "Guaranda",
    canton: "Guaranda",
    province: "Bolívar",
    latitude: -1.59,
    longitude: -79,
    package: packageInfo,
  },
  package: packageInfo,
  boundary: null,
  bounds: [-79.02, -1.62, -78.98, -1.58],
  centers: [
    {
      code: "C1",
      name: "Museo Histórico",
      description: "Historia de la ciudad",
      latitude: -1.59,
      longitude: -79,
      category: "Cultura",
      type: "Arquitectura",
      subtype: "Museo",
      hierarchy: null,
      categoryCode: "CULTURAL",
      typeCode: "ARCHITECTURE",
      subtypeCode: "MUSEUM",
      provinceCode: "02",
      cantonCode: "0201",
      parishCode: "020101",
      hierarchyCode: null,
    },
  ],
  establishments: [
    {
      name: "Cafetería del Parque",
      category: "Café",
      categoryLabel: "Cafetería",
      latitude: -1.59,
      longitude: -79,
      approximate: false,
      icon: "eat-drink-cafe",
      group: "cafes",
      activity: "Alimentos y bebidas",
      classification: null,
      address: "Calle Sucre",
      phone: null,
      localityName: "Guaranda",
    },
  ],
  pois: [
    {
      key: "P1",
      name: "Mirador",
      description: "Vista panorámica",
      category: null,
      latitude: -1.6,
      longitude: -79,
      icon: "tourism-viewpoint",
    },
  ],
  routes: [
    {
      key: "R1",
      publicKey: "terminal-mirador",
      name: "Ruta al Mirador",
      origin: "Terminal",
      destination: "Mirador",
      durationMinutes: null,
      durationEstimated: false,
      geometry: {
        type: "LineString",
        coordinates: [
          [-79, -1.59],
          [-79, -1.6],
        ],
      },
      directions: [],
    },
  ],
};
const remoteCenter: PublicSearchResult = {
  kind: "center",
  source: "internal",
  title: "Museo Histórico",
  subtitle: "Cultura",
  latitude: -1.59,
  longitude: -79,
  centerCode: "C1",
};
const remoteCafe: PublicSearchResult = {
  kind: "establishment",
  source: "internal",
  title: "CAFETERIA DEL PARQUE",
  subtitle: "Cafetería",
  latitude: -1.59,
  longitude: -79,
};

describe("unified downloaded search", () => {
  it("searches catastro, centers, POIs and published routes locally", () => {
    for (const [query, kind] of [
      ["cafes", "establishment"],
      ["museo", "center"],
      ["panoramica", "poi"],
      ["terminal", "route"],
    ] as const) {
      const [item] = getOfflineSearchSuggestions([manifest], query, null);
      expect(item?.kind).toBe(kind);
      expect(item?.offline?.slug).toBe("guaranda");
      expect(
        getOfflineBrowserItems(manifest).some(
          (entry) => entry.key === item?.offline?.itemKey,
        ),
      ).toBe(true);
      expect(item?.result).toBeUndefined();
    }
  });
  it("deduplicates online/offline public centers and normalized catastro, preferring online while available", () => {
    for (const [query, remote] of [
      ["museo", remoteCenter],
      ["cafeteria", remoteCafe],
    ] as const) {
      const state = buildSearchSuggestions({
        query,
        manifests: [manifest],
        onlineResults: [remote],
        coordinate: null,
        onlineUnavailable: false,
      });
      expect(state.searchItems).toHaveLength(1);
      expect(state.searchItems[0]?.result).toBe(remote);
    }
  });
  it("on network failure/paused query drops global cache and opens local copies without API identifiers", () => {
    const remoteOutside = {
      ...remoteCenter,
      centerCode: "REMOTE",
      title: "Museo de Quito",
    };
    const state = buildSearchSuggestions({
      query: "museo",
      manifests: [manifest],
      onlineResults: [remoteCenter, remoteOutside],
      coordinate: null,
      onlineUnavailable: true,
    });
    expect(state.searchItems).toHaveLength(1);
    expect(state.searchItems[0]?.offline).toEqual({
      slug: "guaranda",
      cityName: "Guaranda",
      itemKey: "center:C1",
    });
    expect(state.searchItems[0]?.result).toBeUndefined();
    expect(state.offlineCoverage).toEqual([
      { slug: "guaranda", name: "Guaranda" },
    ]);
    expect(
      buildSearchSuggestions({
        query: "quito",
        manifests: [],
        onlineResults: [remoteOutside],
        coordinate: null,
        onlineUnavailable: true,
      }),
    ).toEqual({ searchItems: [], offlineCoverage: [] });
  });
  it("restricts kind and bounds locally and remotely without claiming other downloaded cities", () => {
    expect(
      getOfflineSearchSuggestions([manifest], "museo", null, {
        kind: "establishment",
      }),
    ).toEqual([]);
    const bounds: [number, number, number, number] = [-78.7, -0.5, -78.3, 0];
    expect(
      getOfflineSearchSuggestions([manifest], "museo", null, { bounds }),
    ).toEqual([]);
    expect(getOfflineSearchCoverage([manifest], { bounds })).toEqual([]);
    expect(
      buildSearchSuggestions({
        query: "museo",
        manifests: [manifest],
        onlineResults: [remoteCenter],
        coordinate: null,
        filters: { bounds },
        onlineUnavailable: false,
      }).searchItems,
    ).toEqual([]);
  });
  it("deduplicates packages that include the same center, catastro or published route", () => {
    const second = {
      ...manifest,
      city: { ...manifest.city, slug: "other-city" },
    };
    for (const query of ["museo", "cafeteria", "terminal"]) {
      expect(
        buildSearchSuggestions({
          query,
          manifests: [manifest, second],
          onlineResults: [],
          coordinate: null,
          onlineUnavailable: true,
        }).searchItems,
      ).toHaveLength(1);
    }
  });
  it("uses distance only when a coordinate already exists and accepts API distances of zero", () => {
    const coordinate = { latitude: -1.59, longitude: -79 };
    expect(
      getOfflineSearchSuggestions([manifest], "museo", coordinate)[0]
        ?.distanceMeters,
    ).toBe(0);
    const result = buildSearchSuggestions({
      query: "museo",
      manifests: [],
      onlineResults: [{ ...remoteCenter, distanceMeters: 0 }],
      coordinate,
      onlineUnavailable: false,
    });
    expect(result.searchItems[0]?.distanceMeters).toBe(0);
    expect(
      getOfflineSearchSuggestions([manifest], "museo", null)[0]?.distanceMeters,
    ).toBeNull();
  });
  it("does not show matches for a single character", () => {
    expect(getOfflineSearchSuggestions([manifest], "m", null)).toEqual([]);
  });
  it("includes local points and published routes in geographic places, excluding centers/catastro", () => {
    expect(
      getOfflineSearchSuggestions([manifest], "mirador", null, {
        kind: "geographic",
      }).map((item) => item.kind),
    ).toEqual(["poi", "route"]);
    expect(
      getOfflineSearchSuggestions([manifest], "museo", null, {
        kind: "geographic",
      }),
    ).toEqual([]);
    expect(
      getOfflineSearchSuggestions([manifest], "cafe", null, {
        kind: "geographic",
      }),
    ).toEqual([]);
  });
  it("includes published segments crossing the area even when both endpoints are outside", () => {
    const bounds: [number, number, number, number] = [
      -79.02, -1.62, -78.98, -1.58,
    ];
    const cases: readonly Readonly<{
      coordinates: GeoJSON.Position[];
      expected: number;
    }>[] = [
      {
        coordinates: [
          [-79.1, -1.6],
          [-78.9, -1.6],
        ],
        expected: 1,
      },
      {
        coordinates: [
          [-79, -1.7],
          [-79, -1.5],
        ],
        expected: 1,
      },
      {
        coordinates: [
          [-79.1, -1.58],
          [-78.9, -1.58],
        ],
        expected: 1,
      },
      {
        coordinates: [
          [-79.1, -1.57],
          [-78.9, -1.57],
        ],
        expected: 0,
      },
      {
        coordinates: [
          [-79.03, -1.58],
          [-79.02, -1.57],
        ],
        expected: 0,
      },
    ];
    for (const { coordinates, expected } of cases) {
      const local = {
        ...manifest,
        routes: [
          {
            ...manifest.routes[0]!,
            geometry: { type: "LineString" as const, coordinates },
          },
        ],
      };
      expect(
        getOfflineSearchSuggestions([local], "terminal", null, {
          kind: "geographic",
          bounds,
        }).filter((item) => item.kind === "route"),
      ).toHaveLength(expected);
    }
  });
  it("preserves server relevance and the local score of description matches ahead of fuzzy names", () => {
    const remote: PublicSearchResult = {
      ...remoteCenter,
      kind: "geographic",
      title: "Parque central",
      subtitle: "Guaranda",
      relevance: 300,
    };
    const fuzzy: PublicSearchResult = {
      ...remoteCenter,
      kind: "geographic",
      title: "Panoramico",
      subtitle: "",
      latitude: -1.59,
      longitude: -79,
      relevance: 125,
    };
    const state = buildSearchSuggestions({
      query: "panoramica",
      manifests: [manifest],
      onlineResults: [remote, fuzzy],
      coordinate: { latitude: -1.59, longitude: -79 },
      onlineUnavailable: false,
    });
    expect(
      state.searchItems.map((item) => [item.title, item.relevance]),
    ).toEqual([
      ["Parque central", 300],
      ["Mirador", 200],
      ["Panoramico", 125],
    ]);
    expect(state.searchItems[1]?.offline?.itemKey).toBe("poi:P1");
    const fallback = buildSearchSuggestions({
      query: "panoramica",
      manifests: [manifest],
      onlineResults: [{ ...fuzzy, relevance: undefined }],
      coordinate: null,
      onlineUnavailable: false,
    });
    expect(
      fallback.searchItems.map((item) => [item.title, item.relevance]),
    ).toEqual([
      ["Mirador", 200],
      ["Panoramico", 125],
    ]);
  });
});
