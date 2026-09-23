import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { PublicCenter } from "@/features/centers/domain/public-center";

/** Quick center matches while typing, or the recent searches when empty. */
export function SearchSuggestionsPanel({
  history,
  onClearHistory,
  onRecentPress,
  onSuggestionPress,
  query,
  suggestions,
}: Readonly<{
  history: readonly string[];
  onClearHistory: () => void;
  onRecentPress: (query: string) => void;
  onSuggestionPress: (center: PublicCenter) => void;
  query: string;
  suggestions: readonly PublicCenter[];
}>) {
  const colors = useTurismoPalette();
  const hasQuery = query.trim().length > 0;
  const showHistory = !hasQuery && history.length > 0;
  const showSuggestions = suggestions.length > 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.panel}
    >
      {showSuggestions ? (
        <View>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textMuted }]}
          >
            Coincidencias rápidas
          </Text>
          {suggestions.map((center) => {
            const meta = [center.category, center.type]
              .filter(Boolean)
              .join(" · ");
            return (
              <Pressable
                accessibilityHint="Centra el mapa y abre la ficha turística"
                accessibilityLabel={`${center.name}, ${meta}`}
                accessibilityRole="button"
                key={center.code}
                onPress={() => onSuggestionPress(center)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="mapPin"
                  size={turismoIconSizes.sm}
                />
                <View style={styles.rowCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.name, { color: colors.text }]}
                  >
                    {center.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.meta, { color: colors.textMuted }]}
                  >
                    {meta}
                  </Text>
                </View>
                <TurismoIcon
                  color={colors.textFaint}
                  name="chevronRight"
                  size={turismoIconSizes.sm}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {showHistory ? (
        <View>
          <View style={styles.historyHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textMuted }]}
            >
              Búsquedas recientes
            </Text>
            <Pressable
              accessibilityLabel="Borrar búsquedas recientes"
              accessibilityRole="button"
              hitSlop={turismoSpacing.xxs}
              onPress={onClearHistory}
              style={styles.clear}
            >
              <Text style={[styles.clearText, { color: colors.primaryStrong }]}>
                Borrar
              </Text>
            </Pressable>
          </View>
          {history.map((recentQuery) => (
            <Pressable
              accessibilityLabel={`Repetir búsqueda ${recentQuery}`}
              accessibilityRole="button"
              key={recentQuery}
              onPress={() => onRecentPress(recentQuery)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <TurismoIcon
                color={colors.textMuted}
                name="history"
                size={turismoIconSizes.sm}
              />
              <Text
                numberOfLines={1}
                style={[styles.name, styles.rowCopy, { color: colors.text }]}
              >
                {recentQuery}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {hasQuery && !showSuggestions ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Presiona buscar para ver todos los resultados.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: turismoSpacing.md,
  },
  title: {
    ...turismoTypography.caption,
    fontWeight: "700",
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
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
    paddingHorizontal: turismoSpacing.md,
  },
  pressed: { opacity: turismoOpacity.pressed },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { ...turismoTypography.label },
  meta: { ...turismoTypography.caption },
  empty: {
    ...turismoTypography.caption,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.md,
  },
});
