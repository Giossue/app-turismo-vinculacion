export type PublicSearchResult = Readonly<{
  kind: "center" | "establishment" | "geographic";
  source: "internal" | "photon";
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  centerCode?: string;
  category?: string | null;
  type?: string | null;
  subtype?: string | null;
  hierarchy?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  subtypeCode?: string | null;
  provinceCode?: string | null;
  cantonCode?: string | null;
  parishCode?: string | null;
  hierarchyCode?: string | null;
  approximate?: boolean;
  icon?: string;
  color?: string;
}>;

export type PublicSearchResultPage = Readonly<{
  items: readonly PublicSearchResult[];
  photonAvailable: boolean;
}>;
