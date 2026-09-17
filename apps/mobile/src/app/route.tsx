import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  TourismHeader,
  TourismProfilePopover,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

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
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.headerWrap}>
        <TourismHeader
          onBack={() => router.back()}
          onProfile={() => setProfileVisible(true)}
          subtitle="NAVEGACIÓN"
          title="Cómo llegar"
        />
      </View>
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
      <TourismProfilePopover
        onClose={() => setProfileVisible(false)}
        onItinerary={() => {
          setProfileVisible(false);
          router.push("/itinerary" as never);
        }}
        onSaved={() => setProfileVisible(false)}
        visible={profileVisible}
      />
    </SafeAreaView>
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
  safeArea: { flex: 1 },
  headerWrap: { paddingHorizontal: turismoSpacing.md },
  content: {
    gap: turismoSpacing.lg,
    padding: turismoSpacing.md,
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
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  routeCopy: { flex: 1, gap: turismoSpacing.xxs },
  routeTitle: { ...turismoTypography.heading },
  routeMeta: { ...turismoTypography.caption },
  metrics: { flexDirection: "row", gap: turismoSpacing.xs },
  metric: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 2,
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
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepCopy: { flex: 1, gap: turismoSpacing.xxs },
  stepInstruction: { ...turismoTypography.body },
  stepDistance: { ...turismoTypography.caption },
  stepLine: {
    bottom: -turismoSpacing.sm,
    left: 16,
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
