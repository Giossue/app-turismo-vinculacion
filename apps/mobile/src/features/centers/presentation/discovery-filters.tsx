import { ScrollView, StyleSheet, View } from "react-native";

import {
  TourismChoiceChip,
  TourismIconAction,
  TourismSectionTitle,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import type { CenterFilters, DiscoveryCatalog } from "../domain/public-center";

export type DiscoveryFilterValues = Omit<CenterFilters, "text">;

type FilterOption = Readonly<{ code: string; name: string }>;

export function uniqueFilterOptions<T extends FilterOption>(
  options: readonly T[],
): readonly T[] {
  return [...new Map(options.map((option) => [option.code, option])).values()];
}

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
  const uniqueOptions = uniqueFilterOptions(options);
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

export function AdvancedDiscoveryFilters({
  catalog,
  filters,
  onChange,
  onClose,
}: Readonly<{
  catalog?: DiscoveryCatalog;
  filters: DiscoveryFilterValues;
  onChange: (filters: DiscoveryFilterValues) => void;
  onClose?: () => void;
}>) {
  const types = (catalog?.types ?? []).filter(
    (item) =>
      !filters.categoryCode || item.categoryCode === filters.categoryCode,
  );
  const cantons = (catalog?.cantons ?? []).filter(
    (item) =>
      !filters.provinceCode || item.provinceCode === filters.provinceCode,
  );

  return (
    <TourismSurface style={styles.filtersPanel}>
      <View style={styles.filtersPanelHeader}>
        <TourismSectionTitle>Filtrar lugares</TourismSectionTitle>
        {onClose ? (
          <TourismIconAction
            accessibilityLabel="Cerrar filtros"
            icon="close"
            onPress={onClose}
          />
        ) : null}
      </View>
      <FilterChips
        label="Tipo"
        options={types}
        selected={filters.typeCode}
        onChange={(typeCode) =>
          onChange({ ...filters, typeCode, subtypeCode: undefined })
        }
      />
      <FilterChips
        label="Provincia"
        options={catalog?.provinces ?? []}
        selected={filters.provinceCode}
        onChange={(provinceCode) =>
          onChange({
            ...filters,
            provinceCode,
            cantonCode: undefined,
            parishCode: undefined,
          })
        }
      />
      <FilterChips
        label="Cantón"
        options={cantons}
        selected={filters.cantonCode}
        onChange={(cantonCode) =>
          onChange({ ...filters, cantonCode, parishCode: undefined })
        }
      />
      <FilterChips
        label="Jerarquía"
        options={catalog?.hierarchies ?? []}
        selected={filters.hierarchyCode}
        onChange={(hierarchyCode) => onChange({ ...filters, hierarchyCode })}
      />
    </TourismSurface>
  );
}

const styles = StyleSheet.create({
  chipScroll: { flexGrow: 0 },
  chips: {
    alignItems: "center",
    gap: turismoSpacing.xs,
    paddingRight: turismoSpacing.md,
  },
  filtersPanel: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  filtersPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
