import { Pressable, StyleSheet, View } from "react-native";

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
  insetClose = false,
  onClose,
  onIndicatorPress,
  showIndicator = true,
}: Readonly<{
  closeLabel?: string;
  indicatorAccessibilityLabel?: string;
  indicatorExpanded?: boolean;
  /**
   * Baja y mete la X, lejos de la esquina redondeada, sin mover la barra
   * (mismo margen que la X del menú).
   */
  insetClose?: boolean;
  onClose: () => void;
  onIndicatorPress?: () => void;
  /** Sin barra de arrastre, para paneles fijos que solo se cierran con la X. */
  showIndicator?: boolean;
}>) {
  const colors = useTurismoPalette();
  const indicator = (
    <View style={[styles.indicator, { backgroundColor: colors.textFaint }]} />
  );

  return (
    <View style={styles.handle}>
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
  closeInset: {
    right: turismoSpacing.sm + turismoSpacing.xs,
    top: turismoSpacing.sm,
  },
});
