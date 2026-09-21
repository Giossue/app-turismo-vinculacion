export const PUBLIC_TRANSPORT_REPOSITORY = Symbol(
  "PUBLIC_TRANSPORT_REPOSITORY",
);

export type PublicTransportSchedule = Readonly<{
  dayOfWeek: number;
  departureTime: string;
  arrivalTime: string | null;
}>;

export type PublicTransportStop = Readonly<{
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  order: number;
}>;

export type PublicTransportRoute = Readonly<{
  name: string;
  transportType: string;
  operator: string;
  origin: string;
  destination: string;
  price: number | null;
  durationMinutes: number | null;
  arrivalInstruction: string | null;
  stops: readonly PublicTransportStop[];
  schedules: readonly PublicTransportSchedule[];
}>;

export type PublicTransportDetail = Readonly<{
  operator: string;
  terminal: string | null;
  frequency: string | null;
  transferDetail: string | null;
}>;

export type PublicTransportCenter = Readonly<{
  centerName: string;
  transportTypes: readonly string[];
  details: readonly PublicTransportDetail[];
  routes: readonly PublicTransportRoute[];
}>;

export type NearbyTransportStopRoute = Readonly<{
  name: string;
  transportType: string;
  operator: string;
}>;

export type NearbyTransportStop = Readonly<{
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  routes: readonly NearbyTransportStopRoute[];
}>;

export type NearbyTransportStopsQuery = Readonly<{
  latitude: number;
  longitude: number;
  radiusMeters: number;
  limit: number;
}>;

export interface PublicTransportRepository {
  findForPublishedCenter(code: string): Promise<PublicTransportCenter | null>;
  listNearbyStops(
    query: NearbyTransportStopsQuery,
  ): Promise<readonly NearbyTransportStop[]>;
}
