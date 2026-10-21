import type { ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type {
  OfflineSearchCoverage,
  SearchSuggestionItem,
} from "../domain/search-suggestion";
import { useMessages } from "@/core/i18n/use-language";

const kindIcons: Record<SearchSuggestionItem["kind"], TurismoIconName> = {
  center: "landmark",
  establishment: "store",
  geographic: "mapPin",
  poi: "mapPinned",
  route: "route",
};

/** Unified live matches; the keyboard does not intercept result selection. */
export function SearchSuggestionsPanel({
  compact = false,
  controls,
  history,
  isSearching,
  items,
  offlineCoverage,
  onlineUnavailable,
  onClearHistory,
  onRecentPress,
  onRetry,
  onSuggestionPress,
  query,
  searchError,
}: Readonly<{
  compact?: boolean;
  controls?: ReactNode;
  history: readonly string[];
  isSearching: boolean;
  items: readonly SearchSuggestionItem[];
  offlineCoverage: readonly OfflineSearchCoverage[];
  onlineUnavailable: boolean;
  onClearHistory: () => void;
  onRecentPress: (query: string) => void;
  onRetry: () => void;
  onSuggestionPress: (item: SearchSuggestionItem) => void;
  query: string;
  searchError: unknown;
}>) {
  const text = useMessages().explore.search;
  const colors = useTurismoPalette();
  const hasQuery = query.trim().length >= 2;
  const showHistory = !query.trim() && history.length > 0;
  const unavailable = onlineUnavailable || Boolean(searchError);
  return (
    <FlatList
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.panel}
      contentContainerStyle={styles.content}
      data={hasQuery ? items : []}
      keyExtractor={(item) => item.key}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      renderItem={({ item }) => (
        <SearchSuggestionRow
          compact={compact}
          item={item}
          onPress={onSuggestionPress}
        />
      )}
      ListHeaderComponent={
        <>
          {controls}
          {hasQuery && unavailable ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.notice, { color: colors.textMuted }]}
            >
              {offlineCoverage.length
                ? text.offlineWithCities(
                    offlineCoverage.map((city) => city.name).join(", "),
                  )
                : text.offlineNoCities}
            </Text>
          ) : null}
          {hasQuery && isSearching ? (
            <TourismStateView
              layout="inline"
              title={text.searching}
              variant="loading"
            />
          ) : null}
          {hasQuery && items.length ? (
            <View>
              {!compact ? (
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.textMuted }]}
                >
                  Resultados
                </Text>
              ) : null}
            </View>
          ) : null}
          {hasQuery && !isSearching && !items.length ? (
            <TourismStateView
              layout="inline"
              message={unavailable ? text.retryOnline : text.emptyHint}
              onAction={unavailable ? onRetry : undefined}
              title={unavailable ? text.failedTitle : text.emptyTitle}
              variant={unavailable ? "error" : "empty"}
            />
          ) : null}
          {showHistory ? (
            <View>
              <View style={styles.historyHeader}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.textMuted }]}
                >
                  {text.recent}
                </Text>
                <Pressable
                  accessibilityLabel={text.clearRecent}
                  accessibilityRole="button"
                  onPress={onClearHistory}
                  style={styles.clear}
                >
                  <Text
                    style={[styles.clearText, { color: colors.primaryStrong }]}
                  >
                    {text.clear}
                  </Text>
                </Pressable>
              </View>
              {history.map((recentQuery) => (
                <Pressable
                  accessibilityLabel={text.repeat(recentQuery)}
                  accessibilityRole="button"
                  key={recentQuery}
                  onPress={() => onRecentPress(recentQuery)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <TurismoIcon
                    color={colors.textMuted}
                    name="history"
                    size={turismoIconSizes.sm}
                  />
                  <Text
                    style={[
                      styles.name,
                      styles.rowCopy,
                      { color: colors.text },
                    ]}
                  >
                    {recentQuery}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!hasQuery ? (
            <Text style={[styles.notice, { color: colors.textMuted }]}>
              {text.minLength}
            </Text>
          ) : null}
        </>
      }
    />
  );
}

function SearchSuggestionRow({
  compact,
  item,
  onPress,
}: Readonly<{
  compact: boolean;
  item: SearchSuggestionItem;
  onPress: (item: SearchSuggestionItem) => void;
}>) {
  const colors = useTurismoPalette();

  const text = useMessages().explore.search;
  const kind = { icon: kindIcons[item.kind], label: text.kinds[item.kind] };
  const meta = [kind.label, item.subtitle].filter(Boolean).join(" · ");
  const localLabel = item.offline ? text.offlineMap(item.offline.cityName) : "";
  return (
    <Pressable
      accessibilityHint={item.offline ? text.openOffline : text.showOnMap}
      accessibilityLabel={[item.title, meta, localLabel]
        .filter(Boolean)
        .join(", ")}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        compact && styles.compactRow,
        pressed && styles.pressed,
      ]}
    >
      <TurismoIcon
        color={colors.primaryStrong}
        name={kind.icon}
        size={turismoIconSizes.sm}
      />
      <View style={styles.rowCopy}>
        <Text style={[styles.name, { color: colors.text }]}>{item.title}</Text>
        {!compact ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>{meta}</Text>
        ) : null}
        {localLabel && !compact ? (
          <Text style={[styles.meta, { color: colors.primaryStrong }]}>
            {localLabel}
          </Text>
        ) : null}
      </View>
      <TurismoIcon
        color={colors.textFaint}
        name="chevronRight"
        size={turismoIconSizes.sm}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { paddingBottom: turismoSpacing.xl },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  title: {
    ...turismoTypography.caption,
    fontWeight: "700",
    paddingVertical: turismoSpacing.sm,
  },
  clear: {
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.md,
  },
  clearText: { ...turismoTypography.caption, fontWeight: "700" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
    paddingVertical: turismoSpacing.sm,
  },
  pressed: { opacity: turismoOpacity.pressed },
  compactRow: { paddingVertical: turismoSpacing.xxs },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { ...turismoTypography.label },
  meta: { ...turismoTypography.caption },
  notice: { ...turismoTypography.caption, paddingVertical: turismoSpacing.sm },
});
