import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismIconAction } from "@/core/ui/tourism-map-actions";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";

type SaveControl = Readonly<{
  accessibilityLabel: string;
  saved: boolean;
  toggle: () => void;
}>;

/** «Cómo llegar» con el ícono de guardar a su lado (solo ícono, sin texto). */
export function PlaceActions({
  onOpenRoute,
  save,
}: Readonly<{ onOpenRoute: (() => void) | null; save: SaveControl | null }>) {
  return (
    <View style={styles.row}>
      {onOpenRoute ? (
        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
          style={styles.route}
        />
      ) : null}
      {save ? (
        <TourismIconAction
          accessibilityLabel={save.accessibilityLabel}
          filled={save.saved}
          icon="bookmark"
          onPress={save.toggle}
          selected={save.saved}
          style={styles.save}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  route: { flex: 1 },
  save: {
    height: turismoMetrics.controlMd,
    width: turismoMetrics.controlMd,
  },
});
