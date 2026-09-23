import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import {
  useTurismoPalette,
  useTurismoTheme,
  type ThemePreference,
} from "@/core/ui/theme-context";
import { TourismSurface } from "@/core/ui/tourism-controls";
import {
  TourismRadioGroup,
  type TourismRadioOption,
} from "@/core/ui/tourism-fields";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";

const appearanceOptions: readonly TourismRadioOption<ThemePreference>[] = [
  {
    description: "Sigue la apariencia del dispositivo.",
    icon: "sunMoon",
    label: "Sistema",
    value: "system",
  },
  { icon: "sun", label: "Claro", value: "light" },
  { icon: "moon", label: "Oscuro", value: "dark" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { preference, setPreference } = useTurismoTheme();

  return (
    <TourismScreenFrame onBack={() => router.back()} title="Configuración">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Apariencia
        </Text>
        <TourismSurface style={styles.preferenceCard}>
          <TourismRadioGroup
            accessibilityLabel="Apariencia"
            layout="column"
            onChange={setPreference}
            options={appearanceOptions}
            value={preference}
          />
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
  preferenceCard: { padding: turismoSpacing.sm },
});
