import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackgroundProps,
} from "@gorhom/bottom-sheet";
import { createContext, useContext, type ReactNode, type Ref } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTourismTabBarInset } from "./tourism-tab-bar";
import { useTurismoPalette } from "./theme-context";
import { TourismGlassFill, turismoGlassBorderWidth } from "./tourism-glass";
import { turismoRadii, turismoSpacing } from "./tokens";

/**
 * Borde superior que no deben cruzar las sheets al expandirse (por ejemplo,
 * el buscador fijo de Explorar), para no quedar por detrás de él.
 */
const TourismSheetTopInsetContext = createContext(0);

export function TourismSheetTopInsetProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: number }>) {
  return (
    <TourismSheetTopInsetContext.Provider value={value}>
      {children}
    </TourismSheetTopInsetContext.Provider>
  );
}

/** Fondo de vidrio de las sheets que flotan sobre el mapa. */
function GlassSheetBackground({ style }: BottomSheetBackgroundProps) {
  const colors = useTurismoPalette();
  return (
    <View
      pointerEvents="none"
      style={[style, styles.glassBackground, { borderColor: colors.border }]}
    >
      <TourismGlassFill material="regular" />
    </View>
  );
}

const tourismFlexibleSheetSnapPoints = ["44%", "92%"];

const tourismFlexibleSheetBehavior = {
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: true,
  enablePanDownToClose: true,
} as const;

const tourismAgentSheetSnapPoints = ["100%"];

const tourismAgentSheetBehavior = {
  android_keyboardInputMode: "adjustResize",
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: false,
  enableOverDrag: false,
  enablePanDownToClose: false,
  keyboardBehavior: "interactive",
  keyboardBlurBehavior: "restore",
} as const;

/**
 * Map overlay sheet that opens at 44 % and expands to 92 %. Swiping it down
 * calls `onClose`; the owner then unmounts it.
 */
export function TourismBottomSheet({
  children,
  onClose,
}: Readonly<{ children: ReactNode; onClose: () => void }>) {
  const tabBarInset = useTourismTabBarInset();
  const topInset = useContext(TourismSheetTopInsetContext);
  return (
    <BottomSheet
      {...tourismFlexibleSheetBehavior}
      backgroundComponent={GlassSheetBackground}
      bottomInset={tabBarInset}
      topInset={topInset}
      index={0}
      onClose={onClose}
      snapPoints={tourismFlexibleSheetSnapPoints}
    >
      {children}
    </BottomSheet>
  );
}

/**
 * Imperative sheet presented with `ref.current?.present()`. `flexible` matches
 * `TourismBottomSheet`; `agent` is the full-height chat sheet that only closes
 * from its own button and has no drag handle.
 */
export function TourismBottomSheetModal({
  children,
  onDismiss,
  ref,
  variant = "flexible",
}: Readonly<{
  children: ReactNode;
  onDismiss: () => void;
  ref?: Ref<BottomSheetModal>;
  variant?: "flexible" | "agent";
}>) {
  const colors = useTurismoPalette();
  const backgroundStyle = { backgroundColor: colors.surface };
  if (variant === "agent") {
    return (
      <BottomSheetModal
        {...tourismAgentSheetBehavior}
        backgroundStyle={backgroundStyle}
        handleComponent={null}
        index={0}
        onDismiss={onDismiss}
        ref={ref}
        snapPoints={tourismAgentSheetSnapPoints}
      >
        {children}
      </BottomSheetModal>
    );
  }
  return (
    <BottomSheetModal
      {...tourismFlexibleSheetBehavior}
      backgroundComponent={GlassSheetBackground}
      index={0}
      onDismiss={onDismiss}
      ref={ref}
      snapPoints={tourismFlexibleSheetSnapPoints}
    >
      {children}
    </BottomSheetModal>
  );
}

/**
 * Scrollable sheet body with the shared padding. With `landscapeMaxWidth`,
 * the content is centered and capped in landscape so lines stay readable.
 */
export function TourismSheetScrollView({
  children,
  contentStyle,
  landscapeMaxWidth,
}: Readonly<{
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  landscapeMaxWidth?: number;
}>) {
  const { height, width } = useWindowDimensions();
  const capWidth = landscapeMaxWidth !== undefined && width > height;
  return (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.content,
        contentStyle,
        capWidth && { maxWidth: landscapeMaxWidth },
      ]}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {children}
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  glassBackground: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoGlassBorderWidth,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    padding: turismoSpacing.lg,
    width: "100%",
  },
});
