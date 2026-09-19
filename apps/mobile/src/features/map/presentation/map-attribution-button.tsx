import { Pressable, StyleSheet, Text } from "react-native";

import { getTurismoMapColors } from "@/core/ui/tokens";
import { useTurismoTheme } from "@/core/ui/theme-context";

export function MapAttributionButton({
  bottom = 4,
  left,
  onPress,
  right,
}: Readonly<{
  bottom?: number;
  left?: number;
  onPress: () => void;
  right?: number;
}>) {
  const { scheme } = useTurismoTheme();
  const colors = getTurismoMapColors(scheme);

  return (
    <Pressable
      accessibilityLabel="Ver atribución del mapa"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          bottom,
          left,
          opacity: pressed ? 0.6 : 0.9,
          right,
        },
      ]}
    >
      <Text style={[styles.icon, { color: colors.attribution }]}>i</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "flex-end",
    paddingBottom: 2,
    paddingLeft: 2,
    position: "absolute",
    width: 44,
  },
  icon: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
});
