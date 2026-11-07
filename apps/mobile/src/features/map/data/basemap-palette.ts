import type { TurismoColorScheme } from "@/core/ui/tokens";

/**
 * Colors applied to the self-hosted OpenMapTiles style. Inspired by Alidade
 * Bright and Alidade Smooth Dark: semantic variety without a dominant yellow,
 * so streets never compete with the tourism pins.
 */
export type BasemapPalette = Readonly<{
  aeroway: string;
  background: string;
  building: string;
  farmland: string;
  grass: string;
  ice: string;
  landuse: string;
  park: string;
  residential: string;
  roadArea: string;
  roadMajor: string;
  roadMinor: string;
  sand: string;
  text: string;
  textHalo: string;
  water: string;
  waterLine: string;
  wood: string;
}>;

export const basemapPalettes: Readonly<
  Record<TurismoColorScheme, BasemapPalette>
> = {
  // El terreno queda por debajo de controles y pines; el contraste del mapa
  // lo aportan calles, agua y zonas verdes.
  dark: {
    aeroway: "#2f3336",
    background: "#1f2225",
    building: "#3f454a",
    farmland: "#343d30",
    grass: "#2c4433",
    ice: "#4a5054",
    landuse: "#232629",
    park: "#30513b",
    residential: "#25282b",
    roadArea: "#33383c",
    roadMajor: "#b4bdc3",
    roadMinor: "#8f999f",
    sand: "#4a4135",
    text: "#eef1f0",
    // Más oscuro que el terreno: despega las etiquetas sobre cualquier zona.
    textHalo: "#141618",
    water: "#2a6a8c",
    waterLine: "#6bb3cf",
    wood: "#274a35",
  },
  light: {
    aeroway: "#f0eee9",
    background: "#f4ece1",
    building: "#e1dfdc",
    farmland: "#dcebd8",
    grass: "#d6ebcf",
    ice: "#f8f7f3",
    landuse: "#eee8dd",
    park: "#cce7c9",
    residential: "#fffdfa",
    roadArea: "#eee9df",
    roadMajor: "#a9aba8",
    roadMinor: "#c1c3bf",
    sand: "#eddfc9",
    text: "#565254",
    textHalo: "#fffdf9",
    water: "#bfe1ed",
    waterLine: "#78b8d0",
    wood: "#c4dfbf",
  },
};

type FillPaletteKey = Exclude<
  keyof BasemapPalette,
  "background" | "roadMajor" | "roadMinor" | "text" | "textHalo" | "waterLine"
>;

/**
 * Fill and fill-extrusion layers take the first matching rule, tested against
 * the lowercase `id` and `source-layer`; unmatched layers use `landuse`.
 */
export const basemapFillRules: readonly Readonly<{
  pattern: RegExp;
  color: FillPaletteKey;
}>[] = [
  { pattern: /building|structure|footprint|house/, color: "building" },
  { pattern: /water|ocean|sea|river|lake/, color: "water" },
  { pattern: /wood|forest/, color: "wood" },
  { pattern: /park|golf/, color: "park" },
  { pattern: /grass|vegetation|scrub|meadow|wetland/, color: "grass" },
  { pattern: /farm|crop/, color: "farmland" },
  { pattern: /sand|bare|earth|rangeland|desert/, color: "sand" },
  { pattern: /ice|glacier/, color: "ice" },
  { pattern: /residential|urban|commercial|industrial/, color: "residential" },
  { pattern: /road|pier/, color: "roadArea" },
  { pattern: /aeroway/, color: "aeroway" },
];
