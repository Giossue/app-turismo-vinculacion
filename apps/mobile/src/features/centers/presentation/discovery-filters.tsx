import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import type { CenterFilters } from "../domain/public-center";
import { uniqueByCode } from "../domain/unique-by-code";

export type DiscoveryFilterValues = Omit<CenterFilters, "text">;

type FilterOption = Readonly<{ code: string; name: string }>;

/**
 * Horizontal "Todo" + option chips. `trailing` appends extra chips (for
 * example "Cerca de mí") after the options.
 */
export function FilterChips({
  glass,
  label,
  onChange,
  options,
  selected,
  trailing,
}: Readonly<{
  /** Chips de vidrio, cuando flotan sobre el mapa. */
  glass?: boolean;
  label: string;
  options: readonly FilterOption[];
  selected?: string;
  onChange: (value: string | undefined) => void;
  trailing?: ReactNode;
}>) {
  if (!options.length && !trailing) return null;
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
        glass={glass}
        label="Todo"
        onPress={() => onChange(undefined)}
        selected={!selected}
      />
      {uniqueOptions.map((option) => (
        <TourismChoiceChip
          glass={glass}
          key={option.code}
          label={option.name}
          onPress={() => onChange(option.code)}
          selected={selected === option.code}
        />
      ))}
      {trailing}
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
