import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTurismoMapPalette } from "@/core/ui/theme-context";
import { turismoOpacity } from "@/core/ui/tokens";

/** Translucent cover shown while MapLibre loads its style. */
export function MapLoadingOverlay({ visible }: Readonly<{ visible: boolean }>) {
  const colors = useTurismoMapPalette();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    opacity: turismoOpacity.loadingOverlay,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
