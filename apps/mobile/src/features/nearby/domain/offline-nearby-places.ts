import { getDistanceMeters } from "@/core/geo/distance";
import type {
  OfflineCityManifest,
  OfflineEstablishment,
} from "@/features/offline/domain/offline-city";
import type { NearbyPlace, NearbyPlacesQuery } from "./nearby-place";

// Mismos valores por defecto que `GET /nearby`.
const defaultRadiusMeters = 5_000;
const defaultLimit = 20;

const termByFilter = { food: "alimentos", lodging: "alojamiento" } as const;

/** «Cerca de mí» calculado con las ciudades descargadas, como lo haría la API. */
export function buildOfflineNearbyPlaces(
  manifests: readonly OfflineCityManifest[],
  query: NearbyPlacesQuery,
): readonly NearbyPlace[] {
  const { filter, latitude, longitude } = query;
  const radius = query.radiusMeters ?? defaultRadiusMeters;
  const distanceTo = (place: { latitude: number; longitude: number }) =>
    getDistanceMeters({ latitude, longitude }, place);
  const places = new Map<string, NearbyPlace>();

  for (const manifest of manifests) {
    if (filter === "all" || filter === "attractions") {
      for (const center of manifest.centers) {
        places.set(`center:${center.code}`, {
          kind: "center",
          code: center.code,
          title: center.name,
          subtitle: `${center.category} · ${center.type}`,
          latitude: center.latitude,
          longitude: center.longitude,
          distanceMeters: distanceTo(center),
        });
      }
    }
    if (filter === "attractions") continue;
    const term = filter === "all" ? null : termByFilter[filter];
    for (const place of manifest.establishments) {
      // Sin id no hay ficha que abrir desde la lista.
      if (place.id === undefined) continue;
      if (term && !matchesTerm(place, term)) continue;
      places.set(`establishment:${place.id}`, {
        kind: "establishment",
        id: place.id,
        activity: place.activity,
        title: place.name,
        subtitle: `${place.categoryLabel ?? place.activity} · ${place.localityName}`,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceMeters: distanceTo(place),
      });
    }
  }

  return [...places.values()]
    .filter((place) => place.distanceMeters <= radius)
    .sort(
      (first, second) =>
        first.distanceMeters - second.distanceMeters ||
        first.title.localeCompare(second.title, "es"),
    )
    .slice(0, query.limit ?? defaultLimit);
}

/** Misma búsqueda que la API: el término puede estar en cualquiera de estos. */
function matchesTerm(place: OfflineEstablishment, term: string): boolean {
  return [
    place.name,
    place.activity,
    place.classification,
    place.category,
  ].some((value) => value?.toLowerCase().includes(term));
}
