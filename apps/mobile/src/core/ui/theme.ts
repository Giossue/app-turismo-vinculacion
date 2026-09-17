import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { turismoColors } from "./tokens";

const sharedColors = {
  primary: turismoColors.dark.primary,
  secondary: turismoColors.dark.accent,
  tertiary: turismoColors.dark.primaryStrong,
};

export const turismoLightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: turismoColors.light.primary,
    secondary: turismoColors.light.accent,
    tertiary: turismoColors.light.primaryStrong,
    background: turismoColors.light.background,
    onPrimary: "#ffffff",
    onSecondary: turismoColors.light.onPrimary,
    onSurface: turismoColors.light.text,
    surface: turismoColors.light.surface,
    surfaceVariant: turismoColors.light.surfaceMuted,
  },
};

export const turismoDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    ...sharedColors,
    background: turismoColors.dark.background,
    onPrimary: "#ffffff",
    onSecondary: turismoColors.dark.onPrimary,
    onSurface: turismoColors.dark.text,
    surface: turismoColors.dark.surface,
    surfaceVariant: turismoColors.dark.surfaceMuted,
  },
};
