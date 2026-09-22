import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

export type TourismTabItem<T extends string> = Readonly<{
  icon?: TurismoIconName;
  label: string;
  value: T;
}>;

/**
 * Underlined tab row. Tabs keep their natural width by default; `fill`
 * splits the row evenly, as in the route mode picker.
 */
export function TourismTabs<T extends string>({
  fill = false,
  items,
  onChange,
  value,
}: Readonly<{
  fill?: boolean;
  items: readonly TourismTabItem<T>[];
  onChange: (value: T) => void;
  value: T;
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.tabs,
        !fill && styles.tabsSpaced,
        { borderBottomColor: colors.border },
      ]}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={turismoMetrics.chipHitSlop}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              styles.tab,
              item.icon && styles.iconTab,
              fill && styles.fillTab,
              selected && { borderBottomColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            {item.icon ? (
              <TurismoIcon
                color={selected ? colors.primary : colors.textMuted}
                name={item.icon}
                size={turismoIconSizes.md}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: selected ? colors.primaryStrong : colors.textMuted },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
  },
  tabsSpaced: { gap: turismoSpacing.lg },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: turismoMetrics.borderWidthStrong,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.xs,
  },
  iconTab: {
    gap: turismoSpacing.xxs,
    minHeight: turismoMetrics.controlLg,
    paddingVertical: turismoSpacing.xxs,
  },
  fillTab: { flex: 1, paddingHorizontal: 0 },
  pressed: { opacity: turismoOpacity.pressed },
  label: { ...turismoTypography.label },
});
