import { StyleSheet, View } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";

/** Optional source filters for the unified public search. */
export type SearchMode = "ALL" | "CENTERS" | "ESTABLISHMENTS" | "GEOGRAPHIC";

export function SearchModeChips({
  glass = true,
  mode,
  onChange,
}: Readonly<{
  glass?: boolean;
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}>) {
  return (
    <View style={styles.row}>
      <TourismChoiceChip
        glass={glass}
        label="Todo"
        onPress={() => onChange("ALL")}
        selected={mode === "ALL"}
      />
      <TourismChoiceChip
        glass={glass}
        label="Atractivos"
        onPress={() => onChange("CENTERS")}
        selected={mode === "CENTERS"}
      />
      <TourismChoiceChip
        glass={glass}
        label="Servicios"
        onPress={() => onChange("ESTABLISHMENTS")}
        selected={mode === "ESTABLISHMENTS"}
      />
      <TourismChoiceChip
        glass={glass}
        label="Lugares"
        onPress={() => onChange("GEOGRAPHIC")}
        selected={mode === "GEOGRAPHIC"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
});
