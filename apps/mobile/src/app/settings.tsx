import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Switch } from "react-native-paper";

import {
  setLanguagePreference,
  useLanguagePreference,
  useMessages,
  type LanguagePreference,
} from "@/core/i18n/use-language";
import { useTurismoPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { TourismSurface } from "@/core/ui/tourism-controls";
import { TourismRadioGroup } from "@/core/ui/tourism-fields";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const m = useMessages();
  const { scheme, setPreference } = useTurismoTheme();
  const languagePreference = useLanguagePreference();
  const darkThemeEnabled = scheme === "dark";
  const text = m.account.settings;
  // Los nombres de idioma se muestran en su propio idioma para reconocerlos.
  const languageOptions = [
    { label: text.languageSystem, value: "system" },
    { label: text.languageNames.es, value: "es" },
    { label: text.languageNames.en, value: "en" },
  ] as const satisfies readonly {
    label: string;
    value: LanguagePreference;
  }[];

  return (
    <TourismScreenFrame onBack={() => router.back()} title={text.title}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.preferenceCard}>
          <Text style={[styles.label, { color: colors.text }]}>
            {text.darkTheme}
          </Text>
          <Switch
            accessibilityLabel={text.darkTheme}
            accessibilityRole="switch"
            accessibilityState={{ checked: darkThemeEnabled }}
            onValueChange={(enabled: boolean) =>
              setPreference(enabled ? "dark" : "light")
            }
            style={styles.switch}
            value={darkThemeEnabled}
          />
        </TourismSurface>
        <TourismSurface style={styles.languageCard}>
          <TourismRadioGroup
            label={text.language}
            layout="column"
            onChange={setLanguagePreference}
            options={languageOptions}
            value={languagePreference}
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
  label: { ...turismoTypography.body, flex: 1 },
  preferenceCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.md,
    padding: turismoSpacing.md,
  },
  languageCard: { padding: turismoSpacing.md },
  switch: {
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
  },
});
