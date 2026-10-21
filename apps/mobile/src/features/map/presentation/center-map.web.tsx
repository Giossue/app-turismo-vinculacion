import { StyleSheet, Text, View } from "react-native";

import { useTurismoMapPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CenterMapProps } from "./center-map.types";
import { useMessages } from "@/core/i18n/use-language";

export function CenterMap({ centers }: CenterMapProps) {
  const m = useMessages();
  const colors = useTurismoMapPalette();
  // This placeholder has no camera or visible geographic area to report.
  return (
    <View
      accessibilityLabel={m.map.webLabel}
      style={[
        styles.container,
        { backgroundColor: colors.primarySoft, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.primaryStrong }]}>
        {m.map.webTitle}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {m.map.webBody(centers.length)}
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
