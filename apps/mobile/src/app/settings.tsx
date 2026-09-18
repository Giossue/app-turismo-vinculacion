import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import {
  TourismActionButton,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { useTurismoTheme } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { preference, scheme, setPreference } = useTurismoTheme();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  const systemLabel =
    scheme === "dark"
      ? "El dispositivo está usando oscuro"
      : "El dispositivo está usando claro";

  return (
    <TourismScreenFrame
      onBack={handleBack}
      subtitle="PREFERENCIAS"
      title="Configuración"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Apariencia</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Personaliza cómo se ve Turismo Vinculación en tus recorridos.
          </Text>
        </View>

        <TourismSurface style={styles.preferenceCard}>
          <View style={styles.preferenceRow}>
            <View
              style={[
                styles.preferenceIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <TurismoIcon
                color={colors.primaryStrong}
                name={scheme === "dark" ? "moon" : "sun"}
                size={turismoIconSizes.md}
              />
            </View>
            <View style={styles.preferenceCopy}>
              <Text style={[styles.preferenceTitle, { color: colors.text }]}>
                Modo oscuro
              </Text>
              <Text
                style={[styles.preferenceBody, { color: colors.textMuted }]}
              >
                {preference === "system"
                  ? systemLabel
                  : "Usar una apariencia oscura"}
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
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.systemRow}>
            <TurismoIcon
              color={colors.textMuted}
              name="settings"
              size={turismoIconSizes.sm}
            />
            <Text style={[styles.systemText, { color: colors.textMuted }]}>
              {preference === "system"
                ? "Tema automático activado"
                : "Tema elegido manualmente"}
            </Text>
          </View>
        </TourismSurface>

        {preference !== "system" ? (
          <TourismActionButton
            icon="refresh"
            label="Usar tema del dispositivo"
            mode="outlined"
            onPress={() => setPreference("system")}
          />
        ) : null}

        <TourismSurface style={styles.infoCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="circleHelp"
            size={turismoIconSizes.md}
          />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            El cambio se aplica inmediatamente al mapa, fichas, agente,
            itinerarios y navegación.
          </Text>
        </TourismSurface>
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  introCopy: { gap: turismoSpacing.xs },
  title: { ...turismoTypography.title },
  body: { ...turismoTypography.body },
  preferenceCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  preferenceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  preferenceIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  preferenceCopy: { flex: 1, gap: turismoSpacing.xxs },
  preferenceTitle: { ...turismoTypography.heading },
  preferenceBody: { ...turismoTypography.caption },
  divider: { height: 1 },
  systemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  systemText: { ...turismoTypography.caption },
  infoCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  infoText: { ...turismoTypography.body, flex: 1 },
});
