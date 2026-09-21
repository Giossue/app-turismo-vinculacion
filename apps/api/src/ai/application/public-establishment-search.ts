export const PUBLIC_ESTABLISHMENT_SEARCH = Symbol(
  "PUBLIC_ESTABLISHMENT_SEARCH",
);

export type PublicEstablishmentSearchQuery = Readonly<{
  activity: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  limit: number;
}>;

export type PublicEstablishmentSearchItem = Readonly<{
  nombreComercial: string;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  localityName: string;
}>;

export type PublicEstablishmentSearchResult = Readonly<{
  items: readonly PublicEstablishmentSearchItem[];
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

export interface PublicEstablishmentSearch {
  nearby(
    query: PublicEstablishmentSearchQuery,
  ): Promise<PublicEstablishmentSearchResult>;
}
