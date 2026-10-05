import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Surface as PaperSurface } from "react-native-paper";

import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { useTurismoPalette } from "./theme-context";

export function TourismSurface({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <PaperSurface
      mode="flat"
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </PaperSurface>
  );
}

export function TourismBadge({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.primarySoft }, style]}
    >
      <Text style={[styles.badgeText, { color: colors.primaryStrong }]}>
        {children}
      </Text>
    </View>
  );
}

export function TourismSectionTitle({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: StyleProp<TextStyle> }>) {
  const colors = useTurismoPalette();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.sectionTitle, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: turismoRadii.lg,
    borderWidth: turismoMetrics.borderWidth,
    padding: turismoSpacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: turismoRadii.pill,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xxs,
  },
  badgeText: { ...turismoTypography.caption },
  sectionTitle: { ...turismoTypography.heading },
});
