import { StyleSheet, Text, View } from "react-native";

import { useTurismoMapPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CenterMapProps } from "./center-map.types";

export function CenterMap({ centers }: CenterMapProps) {
  const colors = useTurismoMapPalette();
  return (
    <View
      accessibilityLabel="Mapa disponible en la aplicación móvil"
      style={[
        styles.container,
        { backgroundColor: colors.primarySoft, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.primaryStrong }]}>
        Mapa móvil
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        El mapa interactivo MapLibre se muestra en el Development Build móvil.
        Hay {centers.length} atractivo(s) publicados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    padding: turismoSpacing.lg,
  },
  title: { ...turismoTypography.heading },
  body: { ...turismoTypography.body, marginTop: turismoSpacing.xs },
});
