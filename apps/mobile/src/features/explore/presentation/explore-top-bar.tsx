import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import { FilterChips } from "@/features/centers/presentation/discovery-filters";
import {
  SearchModeChips,
  type SearchMode,
} from "@/features/search/presentation/search-mode-chips";
import {
  SearchModeField,
  type SearchModeFieldProps,
} from "@/features/search/presentation/search-mode-field";

type CategoryOption = Readonly<{ code: string; name: string }>;

const topEdges: readonly Edge[] = ["top"];

/**
 * Search box over the map. Below it, the category chips; while a
 * search is active, the Atractivos / Servicios cercanos chips instead.
 */
export function ExploreTopBar({
  categories,
  field,
  landscape,
  onCategoryChange,
  onModeChange,
  refreshing,
  searchActive,
  selectedCategory,
}: Readonly<{
  categories: readonly CategoryOption[];
  field: SearchModeFieldProps;
  landscape: boolean;
  onCategoryChange: (categoryCode: string | undefined) => void;
  onModeChange: (mode: SearchMode) => void;
  refreshing: boolean;
  searchActive: boolean;
  selectedCategory?: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <SafeAreaView
      edges={topEdges}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <View style={[styles.controls, landscape && styles.controlsLandscape]}>
        <View style={styles.searchRow}>
          <View style={styles.field}>
            <SearchModeField {...field} />
          </View>
        </View>
        {searchActive ? (
          <SearchModeChips mode={field.mode} onChange={onModeChange} />
        ) : (
          <FilterChips
            label="Categorías de atractivos"
            onChange={onCategoryChange}
            options={categories}
            selected={selectedCategory}
          />
        )}
        {refreshing ? (
          <View
            accessibilityLabel="Actualizando lugares turísticos"
            accessibilityRole="progressbar"
            accessible
            pointerEvents="none"
            style={styles.refreshing}
          >
            <ActivityIndicator color={colors.primaryStrong} size="small" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls: { gap: turismoSpacing.sm, paddingHorizontal: turismoSpacing.md },
  controlsLandscape: {
    alignSelf: "center",
    maxWidth: turismoMetrics.contentMaxWidth,
    width: "100%",
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  field: { flex: 1 },
  refreshing: { alignSelf: "center" },
});
