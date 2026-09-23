import { StyleSheet, Text, View } from "react-native";

import { formatOptionalDistance } from "@/core/format/distance";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import {
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { AgentCard } from "../domain/agent";

export function getAgentCardKey(card: AgentCard): string {
  return card.type === "center"
    ? `center-${card.code}`
    : `${card.type}-${card.name}-${card.latitude ?? "unknown"}`;
}

/**
 * A place in the agent's answer. Published centers open their card;
 * cadastre and POI results only show their public fields.
 */
export function AgentResultCard({
  card,
  onOpenCenter,
}: Readonly<{ card: AgentCard; onOpenCenter: (code: string) => void }>) {
  const colors = useTurismoPalette();
  const details =
    card.type === "center"
      ? []
      : [
          [card.category, card.localityName, formatOptionalDistance(card.distanceMeters)]
            .filter(Boolean)
            .join(" · "),
          card.type === "establishment" ? card.address : null,
          card.type === "establishment" ? card.phone : null,
        ].filter((detail): detail is string => Boolean(detail));

  const content = (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{card.name}</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {card.summary}
      </Text>
      {details.map((detail) => (
        <Text key={detail} style={[styles.caption, { color: colors.textMuted }]}>
          {detail}
        </Text>
      ))}
      {card.type === "center" ? (
        <Text style={[styles.link, { color: colors.primaryStrong }]}>
          Abrir ficha →
        </Text>
      ) : null}
    </>
  );

  if (card.type === "center") {
    return (
      <TourismPressable
        accessibilityLabel={`Abrir ficha de ${card.name}`}
        accessibilityRole="button"
        onPress={() => onOpenCenter(card.code)}
        style={[styles.card, { backgroundColor: colors.primarySoft }]}
      >
        {content}
      </TourismPressable>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: colors.primarySoft }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xs,
    overflow: "hidden",
    padding: turismoSpacing.md,
  },
  title: { ...turismoTypography.bodySmall },
  caption: { ...turismoTypography.caption },
  link: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
});
