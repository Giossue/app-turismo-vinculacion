import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismChoiceChip,
  TourismIconAction,
} from "@/core/ui/tourism-controls";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import type {
  OfflineSearchCoverage,
  SearchScope,
  SearchSuggestionItem,
} from "../domain/search-suggestion";
import { SearchModeChips, type SearchMode } from "./search-mode-chips";
import {
  SearchModeField,
  type SearchModeFieldProps,
} from "./search-mode-field";
import { SearchSuggestionsPanel } from "./search-suggestions-panel";

const overlayEdges: readonly Edge[] = ["top", "bottom"];

/** The list stays under the field until an explicit Back or result selection. */
export function SearchOverlay({
  areaAvailable,
  field,
  history,
  isSearching,
  items,
  offlineCoverage,
  onlineUnavailable,
  onClearHistory,
  onClose,
  onModeChange,
  onRecentPress,
  onRetry,
  onScopeChange,
  onSuggestionPress,
  scope,
  searchError,
}: Readonly<{
  areaAvailable: boolean;
  field: SearchModeFieldProps;
  history: readonly string[];
  isSearching: boolean;
  items: readonly SearchSuggestionItem[];
  offlineCoverage: readonly OfflineSearchCoverage[];
  onlineUnavailable: boolean;
  onClearHistory: () => void;
  onClose: () => void;
  onModeChange: (mode: SearchMode) => void;
  onRecentPress: (query: string) => void;
  onRetry: () => void;
  onScopeChange: (scope: SearchScope) => void;
  onSuggestionPress: (item: SearchSuggestionItem) => void;
  scope: SearchScope;
  searchError: unknown;
}>) {
  const colors = useTurismoPalette();
  const { width, height, fontScale } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Keyboard.isVisible(),
  );
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const compact =
    keyboardVisible && (width > height || fontScale >= 1.5 || height < 600);
  return (
    <SafeAreaView
      accessibilityViewIsModal
      edges={overlayEdges}
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior="padding"
        enabled={Platform.OS === "ios"}
        style={styles.content}
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
            <SearchModeField {...field} autoFocus />
          </View>
          {compact ? (
            <TourismIconAction
              accessibilityLabel="Filtros de búsqueda"
              icon="sliders"
              onPress={Keyboard.dismiss}
              variant="ghost"
            />
          ) : null}
        </View>
        <SearchSuggestionsPanel
          compact={compact}
          controls={
            !compact ? (
              <View style={styles.filters}>
                <SearchModeChips
                  glass={false}
                  mode={field.mode}
                  onChange={onModeChange}
                />
                <View style={styles.scope}>
                  <TourismChoiceChip
                    label="Todo Ecuador"
                    onPress={() => onScopeChange("country")}
                    selected={scope === "country"}
                  />
                  <TourismChoiceChip
                    disabled={!areaAvailable}
                    label="En esta zona"
                    onPress={() => onScopeChange("area")}
                    selected={scope === "area"}
                  />
                </View>
              </View>
            ) : null
          }
          history={history}
          isSearching={isSearching}
          items={items}
          offlineCoverage={offlineCoverage}
          onlineUnavailable={onlineUnavailable}
          onClearHistory={onClearHistory}
          onRecentPress={onRecentPress}
          onRetry={onRetry}
          onSuggestionPress={onSuggestionPress}
          query={field.value}
          searchError={searchError}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, paddingHorizontal: turismoSpacing.md },
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: turismoMetrics.contentMaxWidth,
    width: "100%",
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
  field: { flex: 1, minWidth: 0 },
  filters: { gap: turismoSpacing.sm, paddingVertical: turismoSpacing.sm },
  scope: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
});
