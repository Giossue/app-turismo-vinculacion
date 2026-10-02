import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

const kinds: Record<
  SearchSuggestionItem["kind"],
  { icon: TurismoIconName; label: string }
> = {
  center: { icon: "landmark", label: "Atractivo" },
  establishment: { icon: "store", label: "Servicio" },
  geographic: { icon: "mapPin", label: "Lugar" },
  poi: { icon: "mapPinned", label: "Punto de interés" },
  route: { icon: "route", label: "Recorrido" },
};

/** Unified live matches; the keyboard does not intercept result selection. */
export function SearchSuggestionsPanel({
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
  const colors = useTurismoPalette();
  const hasQuery = query.trim().length >= 2;
  const showHistory = !query.trim() && history.length > 0;
  const unavailable = onlineUnavailable || Boolean(searchError);
  return (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.panel}
      contentContainerStyle={styles.content}
    >
      {controls}
      {hasQuery && unavailable ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.notice, { color: colors.textMuted }]}
        >
          {offlineCoverage.length
            ? `Búsqueda en línea no disponible. Solo puedes buscar en tus mapas descargados: ${offlineCoverage.map((city) => city.name).join(", ")}.`
            : "Búsqueda en línea no disponible. No tienes mapas descargados para buscar sin conexión."}
        </Text>
      ) : null}
      {hasQuery && isSearching ? (
        <TourismStateView
          layout="inline"
          title="Buscando opciones"
          variant="loading"
        />
      ) : null}
      {hasQuery && items.length ? (
        <View>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textMuted }]}
          >
            Resultados
          </Text>
          {items.map((item) => {
            const kind = kinds[item.kind];
            const meta = [kind.label, item.subtitle]
              .filter(Boolean)
              .join(" · ");
            const localLabel = item.offline
              ? `Mapa descargado · ${item.offline.cityName}`
              : "";
            return (
              <Pressable
                accessibilityHint={
                  item.offline
                    ? "Abre este lugar en el mapa descargado"
                    : "Muestra este lugar en el mapa"
                }
                accessibilityLabel={[item.title, meta, localLabel]
                  .filter(Boolean)
                  .join(", ")}
                accessibilityRole="button"
                key={item.key}
                onPress={() => onSuggestionPress(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name={kind.icon}
                  size={turismoIconSizes.sm}
                />
                <View style={styles.rowCopy}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {meta}
                  </Text>
                  {localLabel ? (
                    <Text
                      style={[styles.meta, { color: colors.primaryStrong }]}
                    >
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
          })}
        </View>
      ) : null}
      {hasQuery && !isSearching && !items.length ? (
        <TourismStateView
          layout="inline"
          message={
            unavailable
              ? "Intenta nuevamente cuando tengas conexión."
              : "Prueba otro nombre, tipo de lugar o amplía la búsqueda a Todo Ecuador."
          }
          onAction={unavailable ? onRetry : undefined}
          title={
            unavailable
              ? "No pudimos completar la búsqueda"
              : "No encontramos coincidencias"
          }
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
              Búsquedas recientes
            </Text>
            <Pressable
              accessibilityLabel="Borrar búsquedas recientes"
              accessibilityRole="button"
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
                style={[styles.name, styles.rowCopy, { color: colors.text }]}
              >
                {recentQuery}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!hasQuery ? (
        <Text style={[styles.notice, { color: colors.textMuted }]}>
          Escribe al menos dos caracteres para buscar.
        </Text>
      ) : null}
    </ScrollView>
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
  rowCopy: { flex: 1, minWidth: 0 },
  name: { ...turismoTypography.label },
  meta: { ...turismoTypography.caption },
  notice: { ...turismoTypography.caption, paddingVertical: turismoSpacing.sm },
});
