export type PublicEstablishment = Readonly<{
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
