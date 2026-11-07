import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useMessages } from "@/core/i18n/use-language";
import { useTurismoPalette } from "./theme-context";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/** Encabezado de pantalla secundaria: volver y título. */
export function TourismHeader({
  action,
  onBack,
  title,
}: Readonly<{
  /** Control alineado a la derecha del encabezado. */
  action?: ReactNode;
  onBack?: () => void;
  title?: string;
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  return (
    <View style={styles.header}>
      {onBack ? (
        <TourismPressable
          accessibilityLabel={m.core.back}
          accessibilityRole="button"
          borderlessRipple
          hitSlop={turismoSpacing.xs}
          onPress={onBack}
          style={styles.headerBack}
        >
          <TurismoIcon
            color={colors.text}
            name="arrowLeft"
            size={turismoIconSizes.md}
          />
        </TourismPressable>
      ) : null}
      {title ? (
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.text }]}
        >
          {title}
        </Text>
      ) : null}
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.headerMinHeight,
  },
  headerAction: { marginLeft: "auto" },
  headerBack: { padding: turismoSpacing.xxs },
  headerTitle: { ...turismoTypography.title, flex: 1 },
});
