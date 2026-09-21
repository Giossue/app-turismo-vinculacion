export type PublicPoi = Readonly<{
  name: string;
  description: string | null;
  zoneName: string;
  localityName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}>;

export type PublicPoiPage = Readonly<{
  items: readonly PublicPoi[];
}>;
