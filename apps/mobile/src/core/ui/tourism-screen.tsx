import type { ReactNode } from "react";
import Animated, {
  FadeInRight,
  ReduceMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { TourismHeader } from "./tourism-navigation";
import { useTurismoPalette } from "./tourism-controls";
import { turismoMetrics, turismoMotion, turismoSpacing } from "./tokens";

/**
 * Shared mobile shell for every non-map screen.
 *
 * Keeping safe areas, header geometry and content gutters here prevents each
 * feature screen from slowly developing its own visual language.
 */
export function TourismScreenFrame({
  children,
  includeBottomInset = true,
  onBack,
  onMenu,
  showHeader = true,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  includeBottomInset?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
  showHeader?: boolean;
  subtitle?: string;
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
          <TourismHeader
            onBack={onBack}
            onMenu={onMenu}
            subtitle={subtitle}
            title={title}
          />
        </View>
      ) : null}
      <Animated.View
        entering={FadeInRight.duration(
          turismoMotion.contentTransitionDuration,
        ).reduceMotion(ReduceMotion.System)}
        style={styles.contentFrame}
      >
        {children}
      </Animated.View>
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
