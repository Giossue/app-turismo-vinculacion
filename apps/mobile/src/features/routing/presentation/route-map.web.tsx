import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { RouteMapProps } from "./route-map.types";
import { useMessages } from "@/core/i18n/use-language";

export function RouteMap(_props: RouteMapProps) {
  const m = useMessages();
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>
        {m.routing.preview.mapUnavailableWeb}
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
