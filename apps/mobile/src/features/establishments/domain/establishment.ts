type PublicEstablishment = Readonly<{
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
  name: string;
  category: string | null;
  categoryLabel?: string | null;
  latitude: number;
  longitude: number;
  approximate: boolean;
  icon: string;
  color: string;
}>;

export type MapEstablishmentsResult = Readonly<{
  items: readonly PublicMapEstablishment[];
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
 * Map establishments have no public identifier; name plus coordinates is
 * stable across refetches and identifies the same pin on the map and sheets.
 */
export function getEstablishmentKey(
  establishment: Pick<
    PublicMapEstablishment,
    "latitude" | "longitude" | "name"
  >,
): string {
  return `${establishment.name}:${establishment.latitude}:${establishment.longitude}`;
}

/** Human category of a map establishment, preferring the curated label. */
export function getEstablishmentLabel(
  establishment: Pick<PublicMapEstablishment, "category" | "categoryLabel">,
): string | null {
  return establishment.categoryLabel ?? establishment.category;
}
