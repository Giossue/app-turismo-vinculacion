import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

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
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

export default function CenterDetailScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    setMenuVisible(false);
    return true;
  }, [menuVisible]);

  useScreenBackHandler(handleBeforeBack);
  const {
    data: center,
    error,
    isPending,
    refetch,
  } = usePublishedCenter(code ?? "");

  if (isPending)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Abriendo ficha turística…
        </Text>
      </View>
    );
  if (!center || error)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <TurismoIcon
          color={colors.danger}
          name="wifiOff"
          size={turismoIconSizes.xl}
        />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          No pudimos abrir la ficha.
        </Text>
        <TourismActionButton
          icon="refresh"
          label="Reintentar"
          onPress={() => void refetch()}
        />
      </View>
    );

  return (
    <TourismScreenFrame
      onBack={() => router.back()}
      onMenu={() => setMenuVisible(true)}
      subtitle={center.category}
      title="Ficha turística"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
          <View style={styles.heroIconRow}>
            <View
              style={[styles.heroIcon, { backgroundColor: colors.surface }]}
            >
              <TurismoIcon
                color={colors.primaryStrong}
                name="mapPinned"
                size={turismoIconSizes.xl}
              />
            </View>
            <TourismBadge>Publicada</TourismBadge>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {center.name}
          </Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            {center.description ??
              "La descripción de este atractivo está en actualización."}
          </Text>
          <View style={styles.heroMeta}>
            <TurismoIcon
              color={colors.primaryStrong}
              name="mapPin"
              size={turismoIconSizes.sm}
            />
            <Text
              style={[styles.heroMetaText, { color: colors.primaryStrong }]}
            >
              {center.touristZone}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TourismActionButton
            icon="route"
            label="Cómo llegar"
            onPress={() => router.push("/route" as never)}
            style={styles.flexAction}
          />
          <TourismActionButton
            icon="bookmark"
            label={saved ? "Guardado" : "Guardar"}
            mode="outlined"
            onPress={() => setSaved((value) => !value)}
            style={styles.flexAction}
          />
        </View>
        <Section title="Información" icon="circleHelp">
          <InfoRow
            label="Categoría"
            value={`${center.category} · ${center.type}`}
          />
          <InfoRow label="Código turístico" value={center.code} />
          {center.address ? (
            <InfoRow label="Dirección" value={center.address} />
          ) : null}
          {center.altitudeMeters ? (
            <InfoRow label="Altitud" value={`${center.altitudeMeters} msnm`} />
          ) : null}
        </Section>
        {center.admission ? (
          <Section title="Ingreso y horario" icon="calendar">
            <InfoRow
              label="Acceso"
              value={`${center.admission.type} · ${center.admission.attention}`}
            />
            {center.admission.opensAt || center.admission.closesAt ? (
              <InfoRow
                label="Horario"
                value={`${center.admission.opensAt ?? "--:--"} – ${center.admission.closesAt ?? "--:--"}`}
              />
            ) : null}
          </Section>
        ) : null}
        <Tags title="Actividades" values={center.activities} />
        <Tags title="Accesibilidad confirmada" values={center.accessibility} />
        <Tags title="Facilidades" values={center.facilities} />
        <Pressable
          accessibilityLabel={`Compartir ficha de ${center.name}`}
          accessibilityRole="button"
          onPress={() =>
            void Share.share({
              message: `${center.name} · ${center.touristZone}`,
            })
          }
          style={styles.footerLink}
        >
          <TurismoIcon
            color={colors.primaryStrong}
            name="share"
            size={turismoIconSizes.sm}
          />
          <Text
            style={[styles.footerLinkText, { color: colors.primaryStrong }]}
          >
            Compartir esta ficha
          </Text>
        </Pressable>
      </ScrollView>
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onItinerary={() => {
          setMenuVisible(false);
          router.replace("/itinerary" as never);
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

function Section({
  children,
  icon,
  title,
}: Readonly<{
  children: ReactNode;
  icon: "calendar" | "circleHelp";
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <TourismSurface style={styles.section}>
      <View style={styles.sectionHeading}>
        <TurismoIcon
          color={colors.primaryStrong}
          name={icon}
          size={turismoIconSizes.md}
        />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </TourismSurface>
  );
}
function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textFaint }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}
function Tags({
  title,
  values,
}: Readonly<{ title: string; values: readonly string[] }>) {
  const colors = useTurismoPalette();
  if (!values.length) return null;
  return (
    <TourismSurface style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.tags}>
        {values.map((value) => (
          <TourismBadge key={value}>{value}</TourismBadge>
        ))}
      </View>
    </TourismSurface>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  hero: {
    borderRadius: turismoRadii.lg,
    gap: turismoSpacing.sm,
    padding: turismoSpacing.lg,
  },
  heroIconRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlLg,
    justifyContent: "center",
    width: turismoMetrics.controlLg,
  },
  title: { ...turismoTypography.display },
  description: { ...turismoTypography.body },
  heroMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  heroMetaText: { ...turismoTypography.label },
  actions: { flexDirection: "row", gap: turismoSpacing.sm },
  flexAction: { flex: 1, paddingHorizontal: turismoSpacing.sm },
  section: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  sectionTitle: { ...turismoTypography.heading },
  sectionContent: { gap: turismoSpacing.sm },
  infoRow: { gap: turismoSpacing.xxs },
  infoLabel: { ...turismoTypography.caption },
  infoValue: { ...turismoTypography.body },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
  footerLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "center",
    padding: turismoSpacing.sm,
  },
  footerLinkText: { ...turismoTypography.label },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  loadingText: { ...turismoTypography.body },
  errorTitle: { ...turismoTypography.heading, textAlign: "center" },
});
