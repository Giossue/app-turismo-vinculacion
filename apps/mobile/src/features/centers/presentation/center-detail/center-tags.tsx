import { StyleSheet, View } from "react-native";

import { TourismSection } from "@/core/ui/tourism-content";
import { TourismBadge } from "@/core/ui/tourism-controls";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { turismoSpacing } from "@/core/ui/tokens";
import { CenterEmptyText } from "./center-empty-text";

/** Titled group of tag chips, or `emptyText` when there are none. */
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
  return (
    <TourismSection icon={icon} title={title} variant={variant}>
      {values.length ? (
        <View style={styles.tags}>
          {values.map((value) => (
            <TourismBadge key={value}>{value}</TourismBadge>
          ))}
        </View>
      ) : (
        <CenterEmptyText>{emptyText}</CenterEmptyText>
      )}
    </TourismSection>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
});
