/**
 * Design tokens for the mobile client.
 *
 * Screens should consume semantic roles from this module rather than declaring
 * literal colors or dimensions locally. React Native dimensions are density
 * independent points, so these values intentionally describe layout intent.
 */

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
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const turismoMetrics = {
  touchTarget: 44,
  controlSm: 40,
  chipHeight: 36,
  chipHitSlop: 4,
  controlMd: 48,
  controlLg: 52,
  avatarSm: 32,
  avatarMd: 40,
  iconButtonLg: 56,
  tabBar: 64,
  popoverTop: 72,
  contentMaxWidth: 720,
  sheetMaxWidth: 560,
  drawerMaxWidth: 360,
  borderWidth: 1,
  borderWidthStrong: 2,
} as const;

export const turismoTypography = {
  // Compact mobile hierarchy: reserve display for the single hero moment,
  // then keep page and section titles visually distinct without dominating
  // a phone viewport.
  display: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
} as const;

export const turismoIconSizes = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 30,
} as const;

export const turismoMotion = {
  drawerAnimationSpeed: 1,
} as const;

export const turismoColors = {
  light: {
    background: "#f5f8f7",
    surface: "#ffffff",
    surfaceMuted: "#e8f0ee",
    surfaceStrong: "#d8e5e2",
    text: "#17201c",
    textMuted: "#52605a",
    textFaint: "#6b7771",
    border: "rgba(20, 83, 45, 0.16)",
    primary: "#166534",
    primaryStrong: "#14532d",
    primarySoft: "#dcfce7",
    accent: "#4b5563",
    warm: "#b45309",
    danger: "#b91c1c",
    info: "#0369a1",
    infoSoft: "rgba(3, 105, 161, 0.16)",
    mapBackground: "#E2ECE6",
    mapSearchIcon: "#ffffff",
    scrim: "rgba(0, 0, 0, 0.42)",
    onPrimary: "#ffffff",
    map: {
      background: "#E2ECE6",
      border: "#D4E2D8",
      attribution: "#176B4D",
      info: "#2C7BE5",
      infoSoft: "rgba(44, 123, 229, 0.24)",
      location: "#2563EB",
      locationSoft: "rgba(37, 99, 235, 0.24)",
      onPrimary: "#FFFFFF",
      primary: "#176B4D",
      primarySoft: "#DCEFE3",
      primaryStrong: "#0F5138",
      surface: "#FFFFFF",
      textMuted: "#52655A",
    },
  },
  dark: {
    background: "#080808",
    surface: "#151515",
    surfaceMuted: "#202020",
    surfaceStrong: "#2a2a2a",
    text: "#f5f5f5",
    textMuted: "#b3b3b3",
    textFaint: "#8a8a8a",
    border: "rgba(245, 245, 245, 0.12)",
    primary: "#22c55e",
    primaryStrong: "#4ade80",
    primarySoft: "#15803d",
    accent: "#b8b8b8",
    warm: "#ffa726",
    danger: "#f44336",
    info: "#29b6f6",
    infoSoft: "rgba(41, 182, 246, 0.24)",
    mapBackground: "#10251A",
    mapSearchIcon: "#ffffff",
    scrim: "rgba(0, 0, 0, 0.58)",
    onPrimary: "#06130a",
    map: {
      background: "#10251A",
      border: "#345844",
      attribution: "#55C58D",
      info: "#8CB8FF",
      infoSoft: "rgba(140, 184, 255, 0.24)",
      location: "#2563EB",
      locationSoft: "rgba(37, 99, 235, 0.24)",
      onPrimary: "#092015",
      primary: "#55C58D",
      primarySoft: "#1A4931",
      primaryStrong: "#8BE2B3",
      surface: "#13231A",
      textMuted: "#B4C9B9",
    },
  },
} as const;

export type TurismoColorScheme = keyof typeof turismoColors;
export type TurismoColors = (typeof turismoColors)[TurismoColorScheme];

export function getTurismoColors(scheme: TurismoColorScheme): TurismoColors {
  return turismoColors[scheme];
}

export function getTurismoMapColors(scheme: TurismoColorScheme) {
  return turismoColors[scheme].map;
}
