import { StyleSheet, View } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";

/** Published tourist attractions, or the tourism registry near the tourist. */
export type SearchMode = "CENTERS" | "ESTABLISHMENTS";

export function SearchModeChips({
  mode,
  onChange,
}: Readonly<{ mode: SearchMode; onChange: (mode: SearchMode) => void }>) {
  return (
    <View style={styles.row}>
      <TourismChoiceChip
        label="Atractivos"
        onPress={() => onChange("CENTERS")}
        selected={mode === "CENTERS"}
      />
      <TourismChoiceChip
        label="Servicios cercanos"
        onPress={() => onChange("ESTABLISHMENTS")}
        selected={mode === "ESTABLISHMENTS"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
});
