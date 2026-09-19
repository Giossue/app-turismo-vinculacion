import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismMenuDrawer } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

const routeSteps = [
  {
    instruction: "Sal desde tu ubicación actual",
    distance: "Inicio",
    icon: "locate" as const,
  },
  {
    instruction: "Sigue la vía principal hacia el centro de Guaranda",
    distance: "1.8 km",
    icon: "route" as const,
  },
  {
    instruction: "Toma el desvío hacia el Mirador El Calvario",
    distance: "850 m",
    icon: "navigation" as const,
  },
];

export default function RouteScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    setMenuVisible(false);
    return true;
  }, [menuVisible]);

  useScreenBackHandler(handleBeforeBack);

  return (
    <TourismScreenFrame
      onBack={() => router.back()}
      onMenu={() => setMenuVisible(true)}
      subtitle="NAVEGACIÓN"
      title="Cómo llegar"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.routeSummary}>
          <View
            style={[styles.routeIcon, { backgroundColor: colors.primarySoft }]}
          >
            <TurismoIcon
              color={colors.primaryStrong}
              name="mapPinned"
              size={turismoIconSizes.lg}
            />
          </View>
          <View style={styles.routeCopy}>
            <Text style={[styles.routeTitle, { color: colors.text }]}>
              Mirador El Calvario
            </Text>
            <Text style={[styles.routeMeta, { color: colors.textMuted }]}>
              Guaranda · ruta sugerida en automóvil
            </Text>
          </View>
          <TourismBadge>Demo</TourismBadge>
        </TourismSurface>
        <View style={styles.metrics}>
          <Metric label="Tiempo estimado" value="12 min" />
          <Metric label="Distancia" value="2.6 km" />
          <Metric label="Modo" value="Auto" />
        </View>
        <TourismSurface style={styles.stepsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Indicaciones
          </Text>
          {routeSteps.map((step, index) => (
            <View key={step.instruction} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name={step.icon}
                  size={turismoIconSizes.sm}
                />
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepInstruction, { color: colors.text }]}>
                  {step.instruction}
                </Text>
                <Text
                  style={[styles.stepDistance, { color: colors.textFaint }]}
                >
                  {step.distance}
                </Text>
              </View>
              {index < routeSteps.length - 1 ? (
                <View
                  style={[styles.stepLine, { backgroundColor: colors.border }]}
                />
              ) : null}
            </View>
          ))}
        </TourismSurface>
        <TourismSurface style={styles.noticeCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="circleHelp"
            size={turismoIconSizes.md}
          />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            La navegación giro a giro se activará cuando el servicio de rutas y
            la ubicación estén habilitados. No se está usando GPS en esta vista
            previa.
          </Text>
        </TourismSurface>
        <TourismActionButton
          icon="arrowLeft"
          label="Volver al mapa"
          onPress={() => router.back()}
          mode="outlined"
        />
      </ScrollView>
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onItinerary={() => {
          setMenuVisible(false);
          router.replace("/itinerary" as never);
        }}
        onOfflineMaps={() => {
          setMenuVisible(false);
          router.push("/offline" as never);
        }}
        onSettings={() => {
          setMenuVisible(false);
          router.push("/settings" as never);
        }}
        onSaved={() => setMenuVisible(false)}
        visible={menuVisible}
      />
    </TourismScreenFrame>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
  },
  routeSummary: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  routeIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  routeCopy: { flex: 1, gap: turismoSpacing.xxs },
  routeTitle: { ...turismoTypography.heading },
  routeMeta: { ...turismoTypography.caption },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
  metric: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    gap: turismoSpacing.xxs,
    minWidth: 96,
    padding: turismoSpacing.sm,
  },
  metricValue: { ...turismoTypography.heading },
  metricLabel: { ...turismoTypography.caption },
  stepsCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  sectionTitle: { ...turismoTypography.heading },
  stepRow: {
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 58,
    position: "relative",
  },
  stepIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  stepCopy: { flex: 1, gap: turismoSpacing.xxs },
  stepInstruction: { ...turismoTypography.body },
  stepDistance: { ...turismoTypography.caption },
  stepLine: {
    bottom: -turismoSpacing.sm,
    left: turismoMetrics.controlSm / 2,
    position: "absolute",
    top: 34,
    width: 1,
  },
  noticeCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  noticeText: { ...turismoTypography.caption, flex: 1 },
});
