import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { RouteMapProps } from "./route-map.types";

export function RouteMap(_props: RouteMapProps) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>
        El mapa de la ruta está disponible en la app para Android e iOS.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    justifyContent: "center",
    padding: turismoSpacing.lg,
  },
  text: { ...turismoTypography.body, textAlign: "center" },
});
