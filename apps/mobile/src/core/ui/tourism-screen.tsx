import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { TourismHeader } from "./tourism-navigation";
import { useTurismoPalette } from "./theme-context";
import { turismoMetrics, turismoSpacing } from "./tokens";

/**
 * Shared mobile shell for every non-map screen.
 *
 * Keeping safe areas, header geometry and content gutters here prevents each
 * feature screen from slowly developing its own visual language. Wrap it in
 * `TurismoSchemeScope` to force a color scheme (e.g. a dark hero).
 */
export function TourismScreenFrame({
  children,
  fullBleed = false,
  includeBottomInset = true,
  onBack,
  showHeader = true,
  title,
}: Readonly<{
  children: ReactNode;
  fullBleed?: boolean;
  includeBottomInset?: boolean;
  onBack?: () => void;
  showHeader?: boolean;
  title: string;
}>) {
  const colors = useTurismoPalette();

  return (
    <SafeAreaView
      edges={includeBottomInset ? ["top", "bottom"] : ["top"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {showHeader ? (
        <View style={styles.headerWrap}>
          <TourismHeader onBack={onBack} title={title} />
        </View>
      ) : null}
      <View
        style={[styles.contentFrame, fullBleed && styles.fullBleedContentFrame]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerWrap: {
    alignSelf: "center",
    paddingHorizontal: turismoSpacing.md,
    width: "100%",
    maxWidth: turismoMetrics.contentMaxWidth,
  },
  contentFrame: {
    alignSelf: "center",
    flex: 1,
    paddingHorizontal: turismoSpacing.md,
    width: "100%",
    maxWidth: turismoMetrics.contentMaxWidth,
  },
  fullBleedContentFrame: {
    alignSelf: "stretch",
    maxWidth: "100%",
    paddingHorizontal: 0,
  },
});
