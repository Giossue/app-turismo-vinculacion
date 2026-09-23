import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";

/**
 * Bottom-right stack of round map controls. Every entry keeps a fixed slot,
 * so a control that hides (compass, location) never shifts the others.
 */
export function MapActionColumn({
  landscape,
  slots,
}: Readonly<{ landscape: boolean; slots: readonly ReactNode[] }>) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, landscape && styles.layerLandscape]}
    >
      <View style={styles.column}>
        {slots.map((slot, index) => (
          // Slots never reorder, so their position is their identity.
          <View key={index} style={styles.slot}>
            {slot}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Size of each control inside a `MapActionColumn` slot. */
export const mapActionStyle = {
  height: turismoMetrics.controlLg,
  width: turismoMetrics.controlLg,
} as const;

const styles = StyleSheet.create({
  layer: {
    alignItems: "flex-end",
    bottom: turismoSpacing.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    left: 0,
    paddingHorizontal: turismoSpacing.md,
    position: "absolute",
    right: 0,
  },
  layerLandscape: { bottom: turismoSpacing.sm },
  column: { gap: turismoSpacing.xs },
  slot: mapActionStyle,
});
