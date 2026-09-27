import { StyleSheet, Text } from "react-native";

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

/** A place in the answer; every card opens its details over the agent. */
export function AgentResultCard({
  card,
  onOpenCard,
}: Readonly<{ card: AgentCard; onOpenCard: (card: AgentCard) => void }>) {
  const colors = useTurismoPalette();
  const details =
    card.type === "center"
      ? []
      : [
          [
            card.type === "poi" ? card.category : null,
            card.localityName,
            formatOptionalDistance(card.distanceMeters),
          ]
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
        <Text
          key={detail}
          style={[styles.caption, { color: colors.textMuted }]}
        >
          {detail}
        </Text>
      ))}
      <Text style={[styles.link, { color: colors.primaryStrong }]}>
        Ver ficha →
      </Text>
    </>
  );

  return (
    <TourismPressable
      accessibilityHint="Abre la ficha sin cerrar el chat"
      accessibilityLabel={`Ver ficha de ${card.name}`}
      accessibilityRole="button"
      onPress={() => onOpenCard(card)}
      style={[styles.card, { backgroundColor: colors.primarySoft }]}
    >
      {content}
    </TourismPressable>
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
  title: { ...turismoTypography.label },
  caption: { ...turismoTypography.caption },
  link: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
});
