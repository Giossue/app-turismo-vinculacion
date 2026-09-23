import { StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import {
  SearchModeField,
  type SearchModeFieldProps,
} from "./search-mode-field";
import { SearchSuggestionsPanel } from "./search-suggestions-panel";

const overlayEdges: readonly Edge[] = ["top", "bottom"];

/**
 * Full-screen search over the map. Leaving the text box (keyboard hidden,
 * submit or "Volver al mapa") closes it through `onClose`.
 */
export function SearchOverlay({
  field,
  history,
  onClearHistory,
  onClose,
  onRecentPress,
  onSuggestionPress,
  suggestions,
}: Readonly<{
  field: SearchModeFieldProps;
  history: readonly string[];
  onClearHistory: () => void;
  onClose: () => void;
  onRecentPress: (query: string) => void;
  onSuggestionPress: (center: PublicCenter) => void;
  suggestions: readonly PublicCenter[];
}>) {
  const colors = useTurismoPalette();
  return (
    <SafeAreaView
      accessibilityViewIsModal
      edges={overlayEdges}
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TourismIconAction
          accessibilityLabel="Volver al mapa"
          icon="arrowLeft"
          onPress={onClose}
          style={styles.back}
          variant="ghost"
        />
        <View style={styles.field}>
          <SearchModeField {...field} autoFocus onBlur={onClose} />
        </View>
      </View>
      <SearchSuggestionsPanel
        history={history}
        onClearHistory={onClearHistory}
        onRecentPress={onRecentPress}
        onSuggestionPress={onSuggestionPress}
        query={field.value}
        suggestions={suggestions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: turismoSpacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  back: {
    height: turismoMetrics.touchTarget,
    width: turismoMetrics.touchTarget,
  },
  field: { flex: 1 },
});
