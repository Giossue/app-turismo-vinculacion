import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";

type SaveControl = Readonly<{
  accessibilityLabel: string;
  saved: boolean;
  toggle: () => void;
}>;

/** «Guardar» / «Guardado» junto a «Cómo llegar». Sin `save`, solo el botón de ruta. */
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
          style={styles.button}
        />
      ) : null}
      {save ? (
        <TourismActionButton
          accessibilityLabel={save.accessibilityLabel}
          icon="bookmark"
          label={save.saved ? "Guardado" : "Guardar"}
          mode="outlined"
          onPress={save.toggle}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: turismoSpacing.sm },
  button: { flex: 1 },
});
