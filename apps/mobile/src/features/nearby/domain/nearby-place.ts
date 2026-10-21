import type { GeoCoordinate } from "@/core/geo/types";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { messages } from "@/core/i18n/language";

/** Filtros fijos de «Cerca de mí»; la API decide qué incluye cada uno. */
export type NearbyFilter = "all" | "attractions" | "food" | "lodging";

export const nearbyFilterOptions: readonly Readonly<{
  icon: TurismoIconName;
  label: string;
  value: NearbyFilter;
}>[] = [
  {
    icon: "mapPinned",
    get label() {
      return messages().community.nearby.filters.all;
    },
    value: "all",
  },
  {
    icon: "landmark",
    get label() {
      return messages().community.nearby.filters.attractions;
    },
    value: "attractions",
  },
  {
    icon: "restaurant",
    get label() {
      return messages().community.nearby.filters.food;
    },
    value: "food",
  },
  {
    icon: "hotel",
    get label() {
      return messages().community.nearby.filters.lodging;
    },
    value: "lodging",
  },
];

export type NearbyPlace =
  | Readonly<{
      kind: "center";
      code: string;
      title: string;
      subtitle: string;
      latitude: number;
      longitude: number;
      distanceMeters: number;
    }>
  | Readonly<{
      kind: "establishment";
      id: number;
      activity: string;
      title: string;
      subtitle: string;
      latitude: number;
      longitude: number;
      distanceMeters: number;
    }>;

export type NearbyPlacesQuery = Readonly<{
  latitude: number;
  longitude: number;
  filter: NearbyFilter;
  radiusMeters?: number;
  limit?: number;
}>;

/**
 * Redondea el punto a unos 100 m (tres decimales) para que cada muestra del
 * GPS no dispare una consulta nueva ni guarde la posición exacta en la caché.
 */
export function toNearbyQueryPoint(coordinate: GeoCoordinate): GeoCoordinate {
  return {
    latitude: Math.round(coordinate.latitude * 1_000) / 1_000,
    longitude: Math.round(coordinate.longitude * 1_000) / 1_000,
  };
}

/** Clave estable para listas y para no repetir un lugar entre fuentes. */
export function getNearbyPlaceKey(place: NearbyPlace): string {
  return place.kind === "center"
    ? `center:${place.code}`
    : `establishment:${place.id}`;
}

/** Ícono según el tipo de lugar; el catastro se distingue por su actividad. */
export function getNearbyPlaceIcon(place: NearbyPlace): TurismoIconName {
  if (place.kind === "center") return "landmark";
  const activity = place.activity.toUpperCase();
  if (activity.includes("ALOJAMIENTO")) return "hotel";
  if (activity.includes("ALIMENTOS")) return "restaurant";
  return "store";
}
