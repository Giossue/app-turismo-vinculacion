import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { AgentItinerary } from "../domain/agent";

/** Proposed visit order; each stop opens its published card. */
export function AgentItineraryCard({
  itinerary,
  onOpenCenter,
  onSave,
  saved,
  saving,
}: Readonly<{
  itinerary: AgentItinerary;
  onOpenCenter: (code: string) => void;
  onSave: () => void;
  saved: boolean;
  saving: boolean;
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {itinerary.title}
      </Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {itinerary.summary}
      </Text>
      <View style={styles.stops}>
        {itinerary.stops.map((stop) => (
          <TourismPressable
            accessibilityLabel={`Abrir parada ${stop.order}: ${stop.name}`}
            accessibilityRole="button"
            key={`${stop.code}-${stop.order}`}
            onPress={() => onOpenCenter(stop.code)}
            style={styles.stop}
          >
            <View
              style={[styles.stopNumber, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[styles.stopNumberText, { color: colors.onPrimary }]}
              >
                {stop.order}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={[styles.stopName, { color: colors.text }]}
            >
              {stop.name}
            </Text>
            <Text style={[styles.caption, { color: colors.primaryStrong }]}>
              Ver
            </Text>
          </TourismPressable>
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.textFaint }]}>
        Propuesta con lugares publicados. Los horarios y tiempos de traslado
        todavía no están confirmados.
      </Text>
      <TourismActionButton
        compact
        disabled={saved || saving}
        label={saved ? "Plan guardado" : saving ? "Guardando…" : "Guardar plan"}
        onPress={onSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  title: { ...turismoTypography.label },
  caption: { ...turismoTypography.caption },
  stops: { gap: turismoSpacing.xs },
  stop: {
    alignItems: "center",
    borderRadius: turismoRadii.sm,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
    overflow: "hidden",
  },
  stopNumber: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  stopNumberText: { ...turismoTypography.label },
  stopName: { ...turismoTypography.bodySmall, flex: 1 },
});
