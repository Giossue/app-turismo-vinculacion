import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import type { GeoBoundingBox } from "@/core/geo/types";
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
import type { ExploreOfflineNotice } from "../application/explore-offline-query-state";
import type { ExploreMapFilter } from "../domain/explore-map-filter";
import { ExploreFilterChips } from "./explore-filter-chips";
import { useMessages } from "@/core/i18n/use-language";

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
  offlineNotice,
  onGoToOfflineCity,
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
  /** Aviso sin conexión; `elsewhere` lleva el mapa a la ciudad descargada. */
  offlineNotice: ExploreOfflineNotice | null;
  onGoToOfflineCity: (bounds: GeoBoundingBox) => void;
  onMapFilterChange: (filter: ExploreMapFilter) => void;
  onModeChange: (mode: SearchMode) => void;
  onMoreFilters: () => void;
  onRetryMap: () => void;
  refreshing: boolean;
  searchActive: boolean;
}>) {
  const m = useMessages();
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
              accessibilityLabel={m.explore.actions.retryMap}
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
        {offlineNotice?.kind === "elsewhere" ? (
          <Pressable
            accessibilityLabel={m.explore.actions.offlineGoTo(
              offlineNotice.cityName,
            )}
            accessibilityLiveRegion="polite"
            accessibilityRole="button"
            hitSlop={turismoMetrics.chipHitSlop}
            onPress={() => onGoToOfflineCity(offlineNotice.bounds)}
            style={styles.offline}
          >
            <TourismGlassFill />
            <Text style={[styles.offlineText, { color: colors.text }]}>
              {m.explore.actions.offlineGoTo(offlineNotice.cityName)}
            </Text>
          </Pressable>
        ) : offlineNotice ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            pointerEvents="none"
            style={styles.offline}
          >
            <TourismGlassFill />
            <Text style={[styles.offlineText, { color: colors.text }]}>
              {offlineNotice.kind === "downloaded"
                ? m.explore.actions.offline
                : m.explore.actions.offlineIncomplete}
            </Text>
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
  offline: {
    alignSelf: "center",
    borderRadius: turismoRadii.pill,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  offlineText: { ...turismoTypography.caption },
});
