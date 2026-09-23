import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { ReactNode, Ref } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTurismoPalette } from "./theme-context";
import { turismoSpacing } from "./tokens";

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
  const colors = useTurismoPalette();
  return (
    <BottomSheet
      {...tourismFlexibleSheetBehavior}
      backgroundStyle={{ backgroundColor: colors.surface }}
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
      backgroundStyle={backgroundStyle}
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
  scroll: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    padding: turismoSpacing.lg,
    width: "100%",
  },
});
