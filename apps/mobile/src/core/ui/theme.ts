import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";

import {
  turismoColors,
  turismoRadii,
  turismoTypography,
  type TurismoColors,
} from "./tokens";

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

/** Maps the Turismo palette onto a Material 3 base theme for Paper. */
function createTurismoPaperTheme(
  base: MD3Theme,
  colors: TurismoColors,
  colorOverrides: Partial<MD3Theme["colors"]> = {},
): MD3Theme {
  return {
    ...base,
    roundness: turismoRadii.md,
    fonts: turismoFonts,
    colors: {
      ...base.colors,
      primary: colors.primary,
      primaryContainer: colors.primarySoft,
      secondary: colors.accent,
      secondaryContainer: colors.surfaceMuted,
      tertiary: colors.primaryStrong,
      background: colors.background,
      onPrimary: colors.onPrimary,
      onPrimaryContainer: colors.primaryStrong,
      onSecondary: colors.text,
      onSecondaryContainer: colors.text,
      onSurface: colors.text,
      onSurfaceVariant: colors.textMuted,
      surface: colors.surface,
      surfaceVariant: colors.surfaceMuted,
      outline: colors.border,
      outlineVariant: colors.border,
      error: colors.danger,
      ...colorOverrides,
    },
  };
}

export const turismoLightTheme = createTurismoPaperTheme(
  MD3LightTheme,
  turismoColors.light,
);

export const turismoDarkTheme = createTurismoPaperTheme(
  MD3DarkTheme,
  turismoColors.dark,
  // El gris claro de `accent` necesita texto oscuro en modo oscuro.
  { onSecondary: turismoColors.dark.onPrimary },
);
