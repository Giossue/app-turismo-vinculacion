import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSection } from "@/core/ui/tourism-content";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { CenterEmptyText } from "./center-empty-text";

/** Titled bulleted list in plain text, or `emptyText` when there are none. */
export function CenterTags({
  emptyText,
  icon,
  title,
  values,
  variant,
}: Readonly<{
  emptyText: string;
  icon: TurismoIconName;
  title: string;
  values: readonly string[];
  variant: "card" | "divided";
}>) {
  const colors = useTurismoPalette();
  return (
    <TourismSection icon={icon} title={title} variant={variant}>
      {values.length ? (
        <View style={styles.list}>
          {values.map((value) => (
            <View key={value} style={styles.item}>
              <Text style={[styles.text, { color: colors.textMuted }]}>•</Text>
              <Text style={[styles.text, styles.value, { color: colors.text }]}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <CenterEmptyText>{emptyText}</CenterEmptyText>
      )}
    </TourismSection>
  );
}

const styles = StyleSheet.create({
  list: { gap: turismoSpacing.xxs },
  item: { flexDirection: "row", gap: turismoSpacing.xs },
  text: { ...turismoTypography.body },
  value: { flex: 1 },
});
