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
import { demoItinerary } from "@/features/itinerary/domain/itinerary";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

export default function ItineraryScreen() {
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
      activeTab="itinerary"
      onMenu={() => setMenuVisible(true)}
      onTabChange={(tab) => {
        if (tab === "explore") router.replace("/");
        if (tab === "agent") router.replace("/agent" as never);
      }}
      subtitle="PLANIFICADOR"
      title="Tu itinerario"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCopy}>
          <Text style={[styles.dateLabel, { color: colors.primaryStrong }]}>
            {demoItinerary.dateLabel}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {demoItinerary.title}
          </Text>
          <Text style={[styles.heroBody, { color: colors.textMuted }]}>
            Una ruta flexible para conocer la ciudad, sus miradores y sus
            sabores.
          </Text>
        </View>
        <TourismSurface style={styles.timelineCard}>
          {demoItinerary.stops.map((stop, index) => (
            <View key={stop.code} style={styles.stopRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[styles.timelineNumber, { color: colors.onPrimary }]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {index < demoItinerary.stops.length - 1 ? (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: colors.primarySoft },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.stopCopy}>
                <View style={styles.stopMeta}>
                  <Text
                    style={[styles.stopTime, { color: colors.primaryStrong }]}
                  >
                    {stop.time}
                  </Text>
                  <TourismBadge>{stop.category}</TourismBadge>
                </View>
                <Text style={[styles.stopName, { color: colors.text }]}>
                  {stop.name}
                </Text>
                <Text
                  style={[styles.stopDuration, { color: colors.textMuted }]}
                >
                  {stop.duration} de visita · {stop.code}
                </Text>
              </View>
              <TurismoIcon
                color={colors.textFaint}
                name="chevronDown"
                size={turismoIconSizes.sm}
              />
            </View>
          ))}
        </TourismSurface>
        <TourismSurface style={styles.noticeCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="route"
            size={turismoIconSizes.md}
          />
          <View style={styles.noticeCopy}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>
              Ruta de demostración
            </Text>
            <Text style={[styles.noticeBody, { color: colors.textMuted }]}>
              Los horarios y tiempos se reemplazarán por datos publicados cuando
              el planificador esté conectado.
            </Text>
          </View>
        </TourismSurface>
        <TourismActionButton
          icon="navigation"
          label="Ver ruta en el mapa"
          onPress={() => router.push("/route" as never)}
        />
      </ScrollView>
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onItinerary={() => setMenuVisible(false)}
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

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
  },
  heroCopy: { gap: turismoSpacing.xs },
  dateLabel: { ...turismoTypography.label, textTransform: "uppercase" },
  heroTitle: { ...turismoTypography.display },
  heroBody: { ...turismoTypography.body },
  timelineCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  stopRow: { flexDirection: "row", gap: turismoSpacing.sm, minHeight: 78 },
  timelineRail: { alignItems: "center", width: 28 },
  timelineDot: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  timelineNumber: { ...turismoTypography.caption },
  timelineLine: {
    flex: 1,
    marginVertical: turismoSpacing.xxs,
    width: 2,
  },
  stopCopy: { flex: 1, gap: turismoSpacing.xxs },
  stopMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  stopTime: { ...turismoTypography.label },
  stopName: { ...turismoTypography.heading },
  stopDuration: { ...turismoTypography.caption },
  noticeCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  noticeCopy: { flex: 1, gap: turismoSpacing.xxs },
  noticeTitle: { ...turismoTypography.label },
  noticeBody: { ...turismoTypography.caption },
});
