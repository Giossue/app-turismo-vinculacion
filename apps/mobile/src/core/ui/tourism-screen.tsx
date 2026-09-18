import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import {
  TourismHeader,
  TourismTabBar,
  type TurismoTab,
} from "./tourism-navigation";
import { useTurismoPalette } from "./tourism-controls";
import { turismoMetrics, turismoSpacing } from "./tokens";

/**
 * Shared mobile shell for every non-map screen.
 *
 * Keeping safe areas, header geometry and content gutters here prevents each
 * feature screen from slowly developing its own visual language.
 */
export function TourismScreenFrame({
  activeTab,
  children,
  onBack,
  onMenu,
  onTabChange,
  subtitle,
  title,
}: Readonly<{
  activeTab?: TurismoTab;
  children: ReactNode;
  onBack?: () => void;
  onMenu?: () => void;
  onTabChange?: (tab: TurismoTab) => void;
  subtitle?: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  const showTabBar = activeTab !== undefined && onTabChange !== undefined;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.headerWrap}>
        <TourismHeader
          onBack={onBack}
          onMenu={onMenu}
          subtitle={subtitle}
          title={title}
        />
      </View>
      <View style={styles.contentFrame}>{children}</View>
      {showTabBar ? (
        <TourismTabBar active={activeTab} onChange={onTabChange} />
      ) : null}
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
});
