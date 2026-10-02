import { describe, expect, it } from "vitest";
import type { OfflineCityManifest } from "../domain/offline-city";
import { filterOfflineBrowserItems, formatOfflineMapSize, getOfflineBrowserItems, mergeOfflineCities } from "./offline-city-browser";

const city = {
  slug: "bolivar-guaranda-guaranda", name: "Guaranda", canton: "Guaranda", province: "Bolívar",
  latitude: -1.59, longitude: -79, package: { version: 1, checksumSha256: null, zoomMin: 8, zoomMax: 14, publishedAt: null },
};
const manifest: OfflineCityManifest = {
  city, package: city.package, boundary: null,
  centers: [{
    code: "C1", name: "Museo histórico", description: "Historia de Guaranda", latitude: -1.59, longitude: -79,
    category: "Manifestaciones culturales", type: "Arquitectura", subtype: "Museo", hierarchy: null,
    categoryCode: "CULTURAL", typeCode: "ARCHITECTURE", subtypeCode: "MUSEUM", provinceCode: "02", cantonCode: "0201", parishCode: "020101", hierarchyCode: null,
  }],
  pois: [{ key: "P1", name: "Mirador", description: "Vista panorámica", category: null, latitude: -1.60, longitude: -79, icon: "tourism-viewpoint" }],
  establishments: [{
    name: "Cafetería del Parque", activity: "Alimentos y bebidas", category: "Café", categoryLabel: "Cafetería", classification: null,
    latitude: -1.59, longitude: -79, approximate: false, icon: "eat-drink-cafe", group: "cafes",
    address: "Calle Sucre", phone: null, localityName: "Guaranda",
  }],
  routes: [{ key: "R1", name: "Ruta al mirador", origin: "Terminal", destination: "Mirador", durationMinutes: null,
    geometry: { type: "LineString", coordinates: [[-79, -1.59], [-79, -1.60]] }, directions: [] }],
};

describe("downloaded city browser", () => {
  it("contains centers, own POIs, establishments and transport routes with distinct keys", () => {
    const items = getOfflineBrowserItems(manifest);
    expect(items).toHaveLength(4);
    expect(new Set(items.map((item) => item.key)).size).toBe(4);
    expect(items.map((item) => item.kind)).toEqual(["place", "place", "place", "route"]);
  });
  it("searches accents, categories, descriptions and route destinations using only the package", () => {
    const items = getOfflineBrowserItems(manifest);
    expect(filterOfflineBrowserItems(items, "  CAFE parque  ").map((item) => item.name)).toEqual(["Cafetería del Parque"]);
    expect(filterOfflineBrowserItems(items, "panoramica").map((item) => item.name)).toEqual(["Mirador"]);
    expect(filterOfflineBrowserItems(items, "terminal").map((item) => item.name)).toEqual(["Ruta al mirador"]);
    expect(filterOfflineBrowserItems(items, "")).toBe(items);
    expect(filterOfflineBrowserItems(items, "hotel inexistente")).toEqual([]);
  });
  it("keeps downloaded cities when the remote catalog is missing and prefers newer metadata without duplicates", () => {
    expect(mergeOfflineCities([], [manifest])).toEqual([city]);
    const updated = { ...city, package: { ...city.package, version: 2 } };
    expect(mergeOfflineCities([updated], [manifest])).toEqual([updated]);
    const unpublished = { ...city, package: null };
    expect(mergeOfflineCities([unpublished], [manifest])).toEqual([unpublished]);
  });
  it("does not fabricate a size when the native pack does not report it", () => {
    expect(formatOfflineMapSize(null)).toBeNull();
    expect(formatOfflineMapSize(Number.NaN)).toBeNull();
    expect(formatOfflineMapSize(-1)).toBeNull();
    expect(formatOfflineMapSize(1024 * 1024)).toBe("1 MB de mapa");
  });
});
