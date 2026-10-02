import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Switch } from "react-native-paper";

import { useTurismoPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { TourismSurface } from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { scheme, setPreference } = useTurismoTheme();
  const darkThemeEnabled = scheme === "dark";

  return (
    <TourismScreenFrame onBack={() => router.back()} title="Configuración">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.preferenceCard}>
          <Text style={[styles.label, { color: colors.text }]}>
            Usar tema oscuro
          </Text>
          <Switch
            accessibilityLabel="Usar tema oscuro"
            accessibilityRole="switch"
            accessibilityState={{ checked: darkThemeEnabled }}
            onValueChange={(enabled: boolean) =>
              setPreference(enabled ? "dark" : "light")
            }
            style={styles.switch}
            value={darkThemeEnabled}
          />
        </TourismSurface>
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  label: { ...turismoTypography.body, flex: 1 },
  preferenceCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.md,
    padding: turismoSpacing.md,
  },
  switch: {
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
  },
});
