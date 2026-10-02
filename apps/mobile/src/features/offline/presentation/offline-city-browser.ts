import type { GeoCoordinate } from "@/core/geo/types";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import { getEstablishmentKey } from "@/features/establishments/domain/establishment";
import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";

export type OfflinePlaceItem = Readonly<{
  kind: "place";
  key: string;
  name: string;
  subtitle: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  approximate: boolean;
  coordinate: GeoCoordinate;
  icon: TurismoIconName;
  mapIcon: string;
  center?: PublicCenter;
}>;

export type OfflineRouteItem = Readonly<{
  kind: "route";
  key: string;
  name: string;
  subtitle: string;
  route: OfflineCityManifest["routes"][number];
}>;

export type OfflineBrowserItem = OfflinePlaceItem | OfflineRouteItem;

/** Local packages remain visible even when the remote catalog fails or changes. */
export function mergeOfflineCities(
  remote: readonly OfflineCity[],
  stored: readonly OfflineCityManifest[],
): readonly OfflineCity[] {
  const cities = new Map(stored.map((manifest) => [manifest.city.slug, manifest.city]));
  for (const city of remote) cities.set(city.slug, city);
  return [...cities.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Builds only from the selected package; no global cache or remote search. */
export function getOfflineBrowserItems(
  manifest: OfflineCityManifest,
): readonly OfflineBrowserItem[] {
  return [
    ...manifest.centers.map<OfflinePlaceItem>((center) => ({
      kind: "place", key: `center:${center.code}`, name: center.name,
      subtitle: center.category, description: center.description,
      address: null, phone: null, approximate: false,
      coordinate: { latitude: center.latitude, longitude: center.longitude },
      icon: "landmark", mapIcon: "tourism-museum", center,
    })),
    ...manifest.pois.map<OfflinePlaceItem>((poi) => ({
      kind: "place", key: `poi:${poi.key}`, name: poi.name,
      subtitle: poi.category ?? "Punto de interés", description: poi.description,
      address: null, phone: null, approximate: false,
      coordinate: { latitude: poi.latitude, longitude: poi.longitude },
      icon: "mapPin", mapIcon: poi.icon,
    })),
    ...manifest.establishments.map<OfflinePlaceItem>((place) => ({
      kind: "place", key: `establishment:${getEstablishmentKey(place)}`, name: place.name,
      subtitle: place.categoryLabel ?? place.category ?? place.activity,
      description: place.classification, address: place.address,
      phone: place.phone, approximate: place.approximate,
      coordinate: { latitude: place.latitude, longitude: place.longitude },
      icon: "mapPin", mapIcon: place.icon,
    })),
    ...manifest.routes.map<OfflineRouteItem>((route) => ({
      kind: "route", key: `route:${route.publicKey ?? route.key}`, name: route.name,
      subtitle: `${route.origin} → ${route.destination}`, route,
    })),
  ];
}

function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function filterOfflineBrowserItems(
  items: readonly OfflineBrowserItem[], query: string,
): readonly OfflineBrowserItem[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter((item) => {
    const searchable = normalizeSearch(
      `${item.name} ${item.subtitle} ${item.kind === "place" ? `${item.description ?? ""} ${item.address ?? ""}` : ""}`,
    );
    return terms.every((term) => searchable.includes(term));
  });
}

export function formatOfflineMapSize(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  return `${(bytes / (1024 * 1024)).toLocaleString("es", { maximumFractionDigits: 1 })} MB de mapa`;
}
