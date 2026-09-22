import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { TourismSurface } from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { useTurismoPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { scheme, setPreference } = useTurismoTheme();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  return (
    <TourismScreenFrame onBack={handleBack} title="Configuración">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Apariencia</Text>

        <TourismSurface style={styles.preferenceCard}>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={[styles.preferenceTitle, { color: colors.text }]}>
                Modo oscuro
              </Text>
            </View>
            <Switch
              accessibilityLabel="Activar modo oscuro"
              accessibilityRole="switch"
              ios_backgroundColor={colors.surfaceStrong}
              onValueChange={(enabled) =>
                setPreference(enabled ? "dark" : "light")
              }
              thumbColor={colors.surface}
              trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
              value={scheme === "dark"}
            />
          </View>
        </TourismSurface>
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  title: { ...turismoTypography.title },
  preferenceCard: { padding: turismoSpacing.md },
  preferenceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  preferenceCopy: { flex: 1, gap: turismoSpacing.xxs },
  preferenceTitle: { ...turismoTypography.heading },
});
