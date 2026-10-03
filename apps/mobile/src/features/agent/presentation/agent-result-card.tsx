import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { AgentCard } from "../domain/agent";
import {
  getAgentTravelTimeRows,
  getAgentTravelTimesAccessibilityLabel,
} from "./agent-travel-times";

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
  const travelTimeRows = getAgentTravelTimeRows(card.travelTimes);
  const travelTimesLabel = getAgentTravelTimesAccessibilityLabel(
    card.travelTimes,
  );
  const category = card.category?.trim() || "Sin categoría";
  const location =
    [
      card.type !== "poi" ? card.address?.trim() : null,
      card.localityName?.trim(),
    ]
      .filter(Boolean)
      .join(" - ") || "Ubicación no disponible";

  const content = (
    <>
      <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
        {card.name}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.caption, { color: colors.textMuted }]}
      >
        {category}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.caption, { color: colors.textMuted }]}
      >
        {location}
      </Text>
      {travelTimeRows.length > 0 && (
        <View style={styles.travelTimes}>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            Desde tu ubicación · aprox.
          </Text>
          <View style={styles.travelTimeList}>
            {travelTimeRows.map((row) => (
              <View key={row.mode} style={styles.travelTimeItem}>
                <TurismoIcon
                  color={colors.textMuted}
                  name={row.icon}
                  size={turismoIconSizes.sm}
                />
                <Text style={[styles.travelTimeValue, { color: colors.text }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Text style={[styles.link, { color: colors.primaryStrong }]}>Ver</Text>
    </>
  );

  return (
    <TourismPressable
      accessibilityHint="Abre los detalles sin cerrar el chat"
      accessibilityLabel={[
        `Ver ${card.name}`,
        category,
        location,
        travelTimesLabel,
      ]
        .filter(Boolean)
        .join(". ")}
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
    gap: turismoSpacing.xxs,
    marginTop: turismoSpacing.xs,
    overflow: "hidden",
    padding: turismoSpacing.sm,
  },
  title: { ...turismoTypography.label },
  caption: { ...turismoTypography.caption },
  travelTimes: { gap: turismoSpacing.xxs, marginTop: turismoSpacing.xxs },
  travelTimeList: {
    columnGap: turismoSpacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: turismoSpacing.xxs,
  },
  travelTimeItem: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: turismoSpacing.xxs,
    maxWidth: "100%",
  },
  travelTimeValue: {
    ...turismoTypography.caption,
    flexShrink: 1,
  },
  link: { ...turismoTypography.caption, marginTop: turismoSpacing.xxs },
});
