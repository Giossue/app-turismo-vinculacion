import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useMessages } from "@/core/i18n/use-language";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSection } from "@/core/ui/tourism-content";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import {
  turismoFixedColors,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

const appLogo = require("@/assets/images/icon.png");

export default function AboutScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const text = useMessages().account.about;
  const appName = Constants.expoConfig?.name ?? "";
  const appVersion = Constants.expoConfig?.version ?? "";
  const bodyStyle = [styles.body, { color: colors.textMuted }];

  return (
    <TourismScreenFrame onBack={() => router.back()} title={text.title}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={appLogo}
            style={styles.logo}
          />
          <Text
            accessibilityRole="header"
            style={[styles.appName, { color: colors.text }]}
          >
            {appName}
          </Text>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            {text.version(appVersion)}
          </Text>
        </View>
        <TourismSection title={text.project} variant="card">
          <Text style={bodyStyle}>{text.abstract}</Text>
        </TourismSection>
        <TourismSection title={text.career} variant="card">
          <Text style={bodyStyle}>{text.careerName}</Text>
        </TourismSection>
        <TourismSection title={text.mission} variant="card">
          <Text style={bodyStyle}>{text.missionText}</Text>
        </TourismSection>
        <TourismSection title={text.vision} variant="card">
          <Text style={bodyStyle}>{text.visionText}</Text>
        </TourismSection>
        <Text style={[styles.copyright, { color: colors.textMuted }]}>
          {text.copyright(new Date().getFullYear())}
        </Text>
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  appName: { ...turismoTypography.title, textAlign: "center" },
  body: { ...turismoTypography.bodySmall },
  brand: { alignItems: "center", gap: turismoSpacing.xxs },
  caption: { ...turismoTypography.caption, textAlign: "center" },
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
    paddingVertical: turismoSpacing.md,
  },
  copyright: { ...turismoTypography.caption, textAlign: "center" },
  logo: {
    // El logo tiene fondo blanco en ambos temas.
    backgroundColor: turismoFixedColors.onLogo,
    borderRadius: turismoRadii.md,
    height: turismoMetrics.iconButtonLg * 2,
    marginBottom: turismoSpacing.xs,
    width: turismoMetrics.iconButtonLg * 2,
  },
});
