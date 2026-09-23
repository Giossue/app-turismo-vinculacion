import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTurismoPalette } from "./theme-context";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

export type TourismTabBarItem = Readonly<{
  key: string;
  label: string;
  icon: TurismoIconName;
  /** Pestaña visible; las acciones (por ejemplo, abrir el menú) nunca lo están. */
  selected?: boolean;
  onPress: () => void;
}>;

/**
 * Barra de navegación inferior de las pantallas principales. Cada elemento
 * decide qué hace al tocarlo: cambiar de pestaña (con `replace`) o abrir un
 * overlay como el menú lateral.
 */
export function TourismTabBar({
  items,
}: Readonly<{ items: readonly TourismTabBarItem[] }>) {
  const colors = useTurismoPalette();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      <View accessibilityRole="tablist" style={styles.row}>
        {items.map((item) => {
          const color = item.selected ? colors.primary : colors.textMuted;
          return (
            <TourismPressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.selected ?? false }}
              borderlessRipple
              key={item.key}
              onPress={item.onPress}
              style={styles.item}
            >
              <TurismoIcon
                color={color}
                name={item.icon}
                size={turismoIconSizes.md}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color },
                  item.selected && styles.labelSelected,
                ]}
              >
                {item.label}
              </Text>
            </TourismPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    alignSelf: "center",
    flexDirection: "row",
    maxWidth: turismoMetrics.contentMaxWidth,
    width: "100%",
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.xxs,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget + turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  label: { ...turismoTypography.caption },
  labelSelected: { fontWeight: "700" },
});
