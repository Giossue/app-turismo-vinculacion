import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { PublicCenter } from "../domain/public-center";

type CenterCardProps = Readonly<{
  center: PublicCenter;
  onPress: () => void;
}>;

export function CenterCard({ center, onPress }: CenterCardProps) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel={`Ver ${center.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.category, { color: colors.primaryStrong }]}>
        {center.category}
      </Text>
      <Text style={[styles.name, { color: colors.text }]}>{center.name}</Text>
      <Text
        numberOfLines={3}
        style={[styles.description, { color: colors.textMuted }]}
      >
        {center.description ?? "Información en actualización."}
      </Text>
      <View style={styles.tags}>
        <View style={[styles.tag, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.tagText, { color: colors.textMuted }]}>
            {center.subtype}
          </Text>
        </View>
        {center.hierarchy ? (
          <View
            style={[
              styles.hierarchyTag,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text
              style={[styles.hierarchyText, { color: colors.primaryStrong }]}
            >
              Jerarquía {center.hierarchy}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.action, { color: colors.primaryStrong }]}>
        Ver ficha turística →
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    padding: turismoSpacing.lg,
  },
  category: { ...turismoTypography.label, fontWeight: "800" as const },
  name: { ...turismoTypography.heading },
  description: { ...turismoTypography.body },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xxs,
  },
  tag: {
    borderRadius: turismoRadii.pill,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xxs,
  },
  tagText: { ...turismoTypography.caption },
  hierarchyTag: {
    borderRadius: turismoRadii.pill,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xxs,
  },
  hierarchyText: { ...turismoTypography.caption, fontWeight: "800" as const },
  action: { ...turismoTypography.label, marginTop: turismoSpacing.xxs },
  pressed: { opacity: 0.8 },
});
