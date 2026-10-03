export type PublicEstablishment = Readonly<{
  /** Absent in older cached responses. */
  id?: number;
  nombreComercial: string;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  categoriaEtiqueta?: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  localityName: string;
}>;

export type PublicMapEstablishment = Readonly<{
  /** Registry id; aggregated tiles (low zoom) and POIs have none. */
  id?: number;
  name: string;
  category: string | null;
  categoryLabel?: string | null;
  latitude: number;
  longitude: number;
  approximate: boolean;
  icon: string;
}>;

export type NearbyEstablishmentsResult = Readonly<{
  items: readonly PublicEstablishment[];
  fallbackApplied: boolean;
  requestedLocalityName: string | null;
  effectiveLocality: Readonly<{
    name: string;
    type: string;
    cantonName: string;
    provinceName: string;
    distanceMeters: number | null;
  }> | null;
}>;

export type NearbyEstablishmentsQuery = Readonly<{
  activity: string;
  category?: string;
  localityId?: number;
  latitude?: number;
  longitude?: number;
  limit?: number;
}>;

/**
 * Identifies the same pin on the map and sheets. The registry id is used when
 * known; otherwise name plus coordinates is stable across refetches.
 */
export function getEstablishmentKey(
  establishment: Pick<
    PublicMapEstablishment,
    "id" | "latitude" | "longitude" | "name"
  >,
): string {
  if (establishment.id !== undefined) return `id:${establishment.id}`;
  return `${establishment.name}:${establishment.latitude}:${establishment.longitude}`;
}

export type EstablishmentPhoto = Readonly<{
  id: number;
  url: string;
  description: string | null;
}>;

/** `GET /establishments/:id`: the public record plus its published photos. */
export type PublicEstablishmentDetail = PublicEstablishment &
  Readonly<{ id: number; photos: readonly EstablishmentPhoto[] }>;

/** `GET /favorites/establishments` item. */
export type SavedEstablishment = PublicEstablishment &
  Readonly<{ id: number; photoUrl: string | null }>;

/** Human category of a map establishment, preferring the curated label. */
export function getEstablishmentLabel(
  establishment: Pick<PublicMapEstablishment, "category" | "categoryLabel">,
): string | null {
  return establishment.categoryLabel ?? establishment.category;
}
