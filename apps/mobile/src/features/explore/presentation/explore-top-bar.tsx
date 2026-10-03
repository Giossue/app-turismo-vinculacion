import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { TourismGlassFill } from "@/core/ui/tourism-glass";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
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
 * active, the unified search source filters instead.
 */
export function ExploreTopBar({
  field,
  landscape,
  mapFilter,
  mapError,
  offline = false,
  onMapFilterChange,
  onModeChange,
  onMoreFilters,
  onRetryMap,
  refreshing,
  searchActive,
}: Readonly<{
  field: SearchModeFieldProps;
  landscape: boolean;
  mapFilter: ExploreMapFilter;
  mapError: unknown;
  /** The map shows only the downloaded cities because the API is unreachable. */
  offline?: boolean;
  onMapFilterChange: (filter: ExploreMapFilter) => void;
  onModeChange: (mode: SearchMode) => void;
  onMoreFilters: () => void;
  onRetryMap: () => void;
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
          {mapError && !refreshing ? (
            <TourismIconAction
              accessibilityLabel="No pudimos actualizar los atractivos. Reintentar"
              icon="refresh"
              onPress={onRetryMap}
              variant="glass"
            />
          ) : null}
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
        {offline ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            pointerEvents="none"
            style={styles.offline}
          >
            <TourismGlassFill />
            <Text style={[styles.offlineText, { color: colors.text }]}>
              Sin conexión: mostrando tus mapas descargados
            </Text>
          </View>
        ) : null}
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
  offline: {
    alignSelf: "center",
    borderRadius: turismoRadii.pill,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  offlineText: { ...turismoTypography.caption },
});
