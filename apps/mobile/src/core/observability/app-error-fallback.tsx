import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  getTurismoColors,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";

/**
 * Shown when the app tree fails to render. It sits outside the theme and Paper
 * providers (they may be what failed), so it reads the system scheme and uses
 * plain React Native components with the Turismo tokens.
 */
export function AppErrorFallback({
  resetError,
}: Readonly<{ resetError: () => void }>) {
  const m = useMessages();
  const colors = getTurismoColors(
    useColorScheme() === "dark" ? "dark" : "light",
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {m.core.errorFallback.title}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {m.core.errorFallback.body}
      </Text>
      <Pressable
        accessibilityLabel={m.core.retry}
        accessibilityRole="button"
        onPress={resetError}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>
          {m.core.retry}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  title: { ...turismoTypography.heading, textAlign: "center" },
  body: { ...turismoTypography.body, textAlign: "center" },
  button: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    justifyContent: "center",
    minHeight: turismoMetrics.controlMd,
    paddingHorizontal: turismoSpacing.xl,
  },
  buttonLabel: { ...turismoTypography.label },
});
