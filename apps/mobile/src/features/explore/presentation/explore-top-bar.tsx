import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import {
  SearchModeChips,
  type SearchMode,
} from "@/features/search/presentation/search-mode-chips";
import {
  SearchModeField,
  type SearchModeFieldProps,
} from "@/features/search/presentation/search-mode-field";
import type { ExploreMapFilter } from "../domain/explore-map-filter";
import { ExploreFilterChips } from "./explore-filter-chips";

const topEdges: readonly Edge[] = ["top"];

/**
 * Search box over the map. Below it, the map filter chips; while a search is
 * active, the Atractivos / Servicios cercanos chips instead.
 */
export function ExploreTopBar({
  field,
  landscape,
  mapFilter,
  onMapFilterChange,
  onModeChange,
  onMoreFilters,
  refreshing,
  searchActive,
}: Readonly<{
  field: SearchModeFieldProps;
  landscape: boolean;
  mapFilter: ExploreMapFilter;
  onMapFilterChange: (filter: ExploreMapFilter) => void;
  onModeChange: (mode: SearchMode) => void;
  onMoreFilters: () => void;
  refreshing: boolean;
  searchActive: boolean;
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
            <SearchModeField {...field} glass />
          </View>
        </View>
        {searchActive ? (
          <SearchModeChips mode={field.mode} onChange={onModeChange} />
        ) : (
          <ExploreFilterChips
            filter={mapFilter}
            onChange={onMapFilterChange}
            onMore={onMoreFilters}
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
