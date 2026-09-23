import { StyleSheet, Text } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoTypography } from "@/core/ui/tokens";

/** Muted sentence shown inside a detail section that has no data. */
export function CenterEmptyText({ children }: Readonly<{ children: string }>) {
  const colors = useTurismoPalette();
  return (
    <Text style={[styles.text, { color: colors.textMuted }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  text: { ...turismoTypography.body },
});
