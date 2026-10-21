import { StyleSheet, View } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";

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
  const m = useMessages();
  return (
    <View style={styles.row}>
      <TourismChoiceChip
        glass={glass}
        label={m.explore.search.modes.all}
        onPress={() => onChange("ALL")}
        selected={mode === "ALL"}
      />
      <TourismChoiceChip
        glass={glass}
        label={m.explore.search.modes.centers}
        onPress={() => onChange("CENTERS")}
        selected={mode === "CENTERS"}
      />
      <TourismChoiceChip
        glass={glass}
        label={m.explore.search.modes.establishments}
        onPress={() => onChange("ESTABLISHMENTS")}
        selected={mode === "ESTABLISHMENTS"}
      />
      <TourismChoiceChip
        glass={glass}
        label={m.explore.search.modes.geographic}
        onPress={() => onChange("GEOGRAPHIC")}
        selected={mode === "GEOGRAPHIC"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
});
