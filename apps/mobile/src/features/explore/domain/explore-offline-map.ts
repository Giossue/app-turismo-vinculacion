import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import type { TurismoColorScheme } from "@/core/ui/tokens";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  getEstablishmentKey,
  type PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import type { ExploreMapFilter } from "./explore-map-filter";

/** Pin drawn from a downloaded city (same shape as the map's `LocalMapPlace`). */
export type ExploreOfflinePlace = Readonly<{
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  icon: string;
}>;

/**
 * Explore map content read only from the downloaded cities, used while the
 * API is unreachable. Places open the same sheets as the registry pins.
 */
export type ExploreOfflineMap = Readonly<{
  centers: readonly PublicCenter[];
  places: readonly ExploreOfflinePlace[];
  establishments: ReadonlyMap<string, PublicMapEstablishment>;
  /** Style saved with the map pack, so the downloaded streets are drawn. */
  mapStyles: Readonly<Record<TurismoColorScheme, StyleSpecification>> | null;
}>;

export function buildExploreOfflineMap(
  manifests: readonly OfflineCityManifest[],
  filter: ExploreMapFilter,
): ExploreOfflineMap | null {
  if (manifests.length === 0) return null;
  const centers = new Map<string, PublicCenter>();
  const establishments = new Map<string, PublicMapEstablishment>();
  const places: ExploreOfflinePlace[] = [];
  const add = (key: string, establishment: PublicMapEstablishment) => {
    if (establishments.has(key)) return;
    establishments.set(key, establishment);
    places.push({
      key,
      name: establishment.name,
      latitude: establishment.latitude,
      longitude: establishment.longitude,
      icon: establishment.icon,
    });
  };

  for (const manifest of manifests) {
    if (filter?.kind !== "establishments") {
      for (const center of manifest.centers) centers.set(center.code, center);
    }
    if (filter?.kind === "tourism") continue;
    for (const place of manifest.establishments) {
      if (filter?.kind === "establishments" && place.group !== filter.group)
        continue;
      add(`establishment:${getEstablishmentKey(place)}`, {
        ...(place.id === undefined ? {} : { id: place.id }),
        name: place.name,
        category: place.category,
        categoryLabel: place.categoryLabel,
        latitude: place.latitude,
        longitude: place.longitude,
        approximate: place.approximate,
        icon: place.icon,
      });
    }
    if (filter?.kind === "establishments") continue;
    for (const poi of manifest.pois) {
      add(`poi:${poi.key}`, {
        name: poi.name,
        category: poi.category,
        categoryLabel: poi.category ?? "Punto de interés",
        latitude: poi.latitude,
        longitude: poi.longitude,
        approximate: false,
        icon: poi.icon,
      });
    }
  }

  return {
    centers: [...centers.values()],
    places,
    establishments,
    mapStyles:
      manifests.find((manifest) => manifest.download)?.download?.mapStyles ??
      null,
  };
}
