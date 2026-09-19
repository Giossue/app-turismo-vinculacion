import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";

import { turismoColors, turismoTypography } from "./tokens";

const turismoFonts = configureFonts({
  config: {
    displayLarge: turismoTypography.display,
    headlineLarge: turismoTypography.display,
    headlineMedium: turismoTypography.title,
    headlineSmall: turismoTypography.heading,
    titleLarge: turismoTypography.title,
    titleMedium: turismoTypography.label,
    titleSmall: turismoTypography.label,
    bodyLarge: turismoTypography.body,
    bodyMedium: turismoTypography.body,
    bodySmall: turismoTypography.caption,
    labelLarge: turismoTypography.label,
    labelMedium: turismoTypography.caption,
    labelSmall: turismoTypography.caption,
  },
});

export const turismoLightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  fonts: turismoFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: turismoColors.light.primary,
    primaryContainer: turismoColors.light.primarySoft,
    secondary: turismoColors.light.accent,
    secondaryContainer: turismoColors.light.surfaceMuted,
    tertiary: turismoColors.light.primaryStrong,
    background: turismoColors.light.background,
    onPrimary: turismoColors.light.onPrimary,
    onPrimaryContainer: turismoColors.light.primaryStrong,
    onSecondary: turismoColors.light.text,
    onSecondaryContainer: turismoColors.light.text,
    onSurface: turismoColors.light.text,
    onSurfaceVariant: turismoColors.light.textMuted,
    surface: turismoColors.light.surface,
    surfaceVariant: turismoColors.light.surfaceMuted,
    outline: turismoColors.light.border,
    outlineVariant: turismoColors.light.border,
    error: turismoColors.light.danger,
  },
};

export const turismoDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 16,
  fonts: turismoFonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: turismoColors.dark.primary,
    primaryContainer: turismoColors.dark.primarySoft,
    secondary: turismoColors.dark.accent,
    secondaryContainer: turismoColors.dark.surfaceMuted,
    tertiary: turismoColors.dark.primaryStrong,
    background: turismoColors.dark.background,
    onPrimary: turismoColors.dark.onPrimary,
    onPrimaryContainer: turismoColors.dark.primaryStrong,
    onSecondary: turismoColors.dark.onPrimary,
    onSecondaryContainer: turismoColors.dark.text,
    onSurface: turismoColors.dark.text,
    onSurfaceVariant: turismoColors.dark.textMuted,
    surface: turismoColors.dark.surface,
    surfaceVariant: turismoColors.dark.surfaceMuted,
    outline: turismoColors.dark.border,
    outlineVariant: turismoColors.dark.border,
    error: turismoColors.dark.danger,
  },
};
