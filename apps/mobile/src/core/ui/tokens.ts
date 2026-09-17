export const turismoSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const turismoRadii = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const turismoTypography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },
  title: { fontSize: 25, lineHeight: 31, fontWeight: "800" as const },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "800" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const },
} as const;

export const turismoIconSizes = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 30,
} as const;

export const turismoColors = {
  light: {
    background: "#F4F7F6",
    surface: "#FFFFFF",
    surfaceMuted: "#E9F0EF",
    surfaceStrong: "#D9E5E3",
    text: "#102324",
    textMuted: "#5E7372",
    textFaint: "#7B8D8C",
    border: "#D5E1DF",
    primary: "#0A8F83",
    primaryStrong: "#076D64",
    primarySoft: "#D5F4EE",
    accent: "#18B7C4",
    warm: "#F28B55",
    danger: "#C94B57",
    mapBackground: "#E8EFEE",
    onPrimary: "#FFFFFF",
  },
  dark: {
    background: "#081819",
    surface: "#102324",
    surfaceMuted: "#173132",
    surfaceStrong: "#214344",
    text: "#F1F8F6",
    textMuted: "#B0C3C0",
    textFaint: "#829C99",
    border: "#2C4A4A",
    primary: "#22C7B7",
    primaryStrong: "#63E3D4",
    primarySoft: "#164A47",
    accent: "#6BE2EA",
    warm: "#FF9A64",
    danger: "#FF7981",
    mapBackground: "#0D2022",
    onPrimary: "#062321",
  },
} as const;

export type TurismoColorScheme = keyof typeof turismoColors;
export type TurismoColors = (typeof turismoColors)[TurismoColorScheme];

export function getTurismoColors(scheme: TurismoColorScheme): TurismoColors {
  return turismoColors[scheme];
}
