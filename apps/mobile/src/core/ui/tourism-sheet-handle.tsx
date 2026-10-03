import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TourismIconAction } from "./tourism-controls";
import {
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
} from "./tokens";

/**
 * Asa estándar de toda sheet o panel inferior: la barra de arrastre al centro
 * (visible en ambos temas) y el botón de cerrar a su misma altura, arriba a la
 * derecha. Con `onIndicatorPress` la barra también se puede tocar (por
 * ejemplo, para expandir o contraer el panel de ruta).
 */
export function TourismSheetHandle({
  closeLabel = "Cerrar",
  indicatorAccessibilityLabel,
  indicatorExpanded,
  hideForLandscapeKeyboard = false,
  insetClose = false,
  leadingAction,
  onClose,
  onIndicatorPress,
  showIndicator = true,
}: Readonly<{
  closeLabel?: string;
  indicatorAccessibilityLabel?: string;
  indicatorExpanded?: boolean;
  /** Reserve the short landscape viewport for editing; Back restores the handle. */
  hideForLandscapeKeyboard?: boolean;
  /**
   * Mete la X hacia dentro, lejos de la esquina redondeada, sin sacarla de la
   * altura de la barra.
   */
  insetClose?: boolean;
  /** Acción opcional a la izquierda, a la misma altura que el cierre. */
  leadingAction?: ReactNode;
  onClose: () => void;
  onIndicatorPress?: () => void;
  /** Sin barra de arrastre, para paneles fijos que solo se cierran con la X. */
  showIndicator?: boolean;
}>) {
  const colors = useTurismoPalette();
  const { width, height } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Keyboard.isVisible(),
  );
  useEffect(() => {
    if (!hideForLandscapeKeyboard) return;
    const shown = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [hideForLandscapeKeyboard]);
  if (hideForLandscapeKeyboard && width > height && keyboardVisible)
    return null;
  const indicator = (
    <View style={[styles.indicator, { backgroundColor: colors.textFaint }]} />
  );

  return (
    <View style={styles.handle}>
      {leadingAction ? (
        <View style={styles.leadingAction}>{leadingAction}</View>
      ) : null}
      {!showIndicator ? null : onIndicatorPress ? (
        <Pressable
          accessibilityLabel={indicatorAccessibilityLabel}
          accessibilityRole="button"
          accessibilityState={
            indicatorExpanded === undefined
              ? undefined
              : { expanded: indicatorExpanded }
          }
          onPress={onIndicatorPress}
          style={({ pressed }) => [
            styles.indicatorButton,
            pressed && styles.pressed,
          ]}
        >
          {indicator}
        </Pressable>
      ) : (
        indicator
      )}
      <TourismIconAction
        accessibilityLabel={closeLabel}
        icon="close"
        onPress={onClose}
        style={[styles.close, insetClose && styles.closeInset]}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
  },
  indicator: {
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.sheetHandleHeight,
    width: turismoMetrics.sheetHandleWidth,
  },
  indicatorButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.xl,
  },
  pressed: { opacity: turismoOpacity.pressed },
  close: { position: "absolute", right: turismoSpacing.sm },
  leadingAction: { position: "absolute", left: turismoSpacing.sm },
  closeInset: { right: turismoSpacing.sm + turismoSpacing.xs },
});
