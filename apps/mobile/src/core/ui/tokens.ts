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
    background: "#F7FAF8",
    surface: "#FFFFFF",
    surfaceMuted: "#EAF3ED",
    surfaceStrong: "#DCEBE1",
    text: "#14221A",
    textMuted: "#52655A",
    textFaint: "#708177",
    border: "#D4E2D8",
    primary: "#176B4D",
    primaryStrong: "#0F5138",
    primarySoft: "#DCEFE3",
    accent: "#238B61",
    warm: "#C8753F",
    danger: "#B84148",
    info: "#2C7BE5",
    infoSoft: "rgba(44, 123, 229, 0.24)",
    mapBackground: "#E2ECE6",
    scrim: "rgba(20, 34, 26, 0.42)",
    onPrimary: "#FFFFFF",
  },
  dark: {
    background: "#0B1611",
    surface: "#13231A",
    surfaceMuted: "#1B3325",
    surfaceStrong: "#284B38",
    text: "#F2F9F3",
    textMuted: "#B4C9B9",
    textFaint: "#8EA999",
    border: "#345844",
    primary: "#55C58D",
    primaryStrong: "#8BE2B3",
    primarySoft: "#1A4931",
    accent: "#64D39A",
    warm: "#FFAD7B",
    danger: "#FF7D85",
    info: "#8CB8FF",
    infoSoft: "rgba(140, 184, 255, 0.24)",
    mapBackground: "#10251A",
    scrim: "rgba(0, 0, 0, 0.58)",
    onPrimary: "#092015",
  },
} as const;

export type TurismoColorScheme = keyof typeof turismoColors;
export type TurismoColors = (typeof turismoColors)[TurismoColorScheme];

export function getTurismoColors(scheme: TurismoColorScheme): TurismoColors {
  return turismoColors[scheme];
}
