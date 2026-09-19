import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/tourism-controls";
import type { CalculatedRoute, RouteCoordinate } from "../domain/routing";

type RouteMapProps = Readonly<{
  destination: RouteCoordinate;
  origin: RouteCoordinate | null;
  route: CalculatedRoute | null;
}>;

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
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 180,
    padding: 20,
  },
  text: { textAlign: "center" },
});
