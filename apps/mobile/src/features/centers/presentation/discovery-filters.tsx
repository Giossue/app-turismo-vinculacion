import { ScrollView, StyleSheet } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import type { CenterFilters } from "../domain/public-center";
import { uniqueByCode } from "../domain/unique-by-code";

export type DiscoveryFilterValues = Omit<CenterFilters, "text">;

type FilterOption = Readonly<{ code: string; name: string }>;

export function FilterChips({
  label,
  onChange,
  options,
  selected,
}: Readonly<{
  label: string;
  options: readonly FilterOption[];
  selected?: string;
  onChange: (value: string | undefined) => void;
}>) {
  if (!options.length) return null;
  const uniqueOptions = uniqueByCode(options);
  return (
    <ScrollView
      accessibilityLabel={label}
      contentContainerStyle={styles.chips}
      horizontal
      style={styles.chipScroll}
      showsHorizontalScrollIndicator={false}
    >
      <TourismChoiceChip
        label="Todo"
        onPress={() => onChange(undefined)}
        selected={!selected}
      />
      {uniqueOptions.map((option) => (
        <TourismChoiceChip
          key={option.code}
          label={option.name}
          onPress={() => onChange(option.code)}
          selected={selected === option.code}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipScroll: { flexGrow: 0 },
  chips: {
    alignItems: "center",
    gap: turismoSpacing.xs,
    paddingRight: turismoSpacing.md,
  },
});
