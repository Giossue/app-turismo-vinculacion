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
  TourismTabBar,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { demoItinerary } from "@/features/itinerary/domain/itinerary";

export default function ItineraryScreen() {
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
          onProfile={() => setProfileVisible(true)}
          subtitle="PLANIFICADOR"
          title="Tu itinerario"
        />
      </View>
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
      <TourismTabBar
        active="itinerary"
        onChange={(tab) => {
          if (tab === "explore") router.replace("/");
          if (tab === "agent") router.replace("/agent" as never);
        }}
      />
      <TourismProfilePopover
        onClose={() => setProfileVisible(false)}
        onItinerary={() => setProfileVisible(false)}
        onSaved={() => setProfileVisible(false)}
        visible={profileVisible}
      />
    </SafeAreaView>
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
  heroCopy: { gap: turismoSpacing.xs },
  dateLabel: { ...turismoTypography.label, textTransform: "uppercase" },
  heroTitle: { ...turismoTypography.display },
  heroBody: { ...turismoTypography.body },
  timelineCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  stopRow: { flexDirection: "row", gap: turismoSpacing.sm, minHeight: 78 },
  timelineRail: { alignItems: "center", width: 28 },
  timelineDot: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  timelineNumber: { ...turismoTypography.caption },
  timelineLine: { flex: 1, marginVertical: 2, width: 2 },
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
