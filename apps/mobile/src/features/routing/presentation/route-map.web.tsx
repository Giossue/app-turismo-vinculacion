import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
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
        Mapa de ruta disponible en el Development Build móvil.
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
  text: { textAlign: "center" },
});
