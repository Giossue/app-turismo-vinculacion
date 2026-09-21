import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
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
  TourismIconAction,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import type { PublicCenterDetail } from "@/features/centers/domain/public-center";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";

type CenterTab = "information" | "opinions" | "photos";
type OpinionRatingSummary = Readonly<{
  averageRating: number | null;
  total: number;
}>;

export default function CenterDetailScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [activeTab, setActiveTab] = useState<CenterTab>("information");
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();
  const {
    data: center,
    error,
    isPending,
    refetch,
  } = usePublishedCenter(code ?? "");
  const saved =
    savedCenters.data?.some(
      (savedCenter) => savedCenter.code === center?.code,
    ) ?? false;
  const opinions = useCenterOpinions(center?.code ?? "");

  if (isPending) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Abriendo ficha turística…
        </Text>
      </View>
    );
  }

  if (!center || error) {
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
  }

  const heroPhoto = center.photos[0];

  return (
    <TourismScreenFrame
      includeBottomInset={false}
      showHeader={false}
      title="Ficha turística"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.detailCard}>
          <View style={styles.heroMedia}>
            {heroPhoto ? (
              <Image
                accessibilityLabel={
                  heroPhoto.description ?? `Fotografía de ${center.name}`
                }
                resizeMethod="resize"
                resizeMode="cover"
                source={{ uri: resolveMediaUrl(heroPhoto.url) }}
                style={styles.heroImage}
              />
            ) : (
              <View
                style={[
                  styles.heroFallback,
                  { backgroundColor: colors.mapBackground },
                ]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="mapPinned"
                  size={turismoIconSizes.xl}
                />
                <Text
                  style={[styles.heroFallbackText, { color: colors.textMuted }]}
                >
                  Sin fotografía principal
                </Text>
              </View>
            )}
            <View
              pointerEvents="none"
              style={[styles.heroScrim, { backgroundColor: colors.scrim }]}
            />
            <View style={styles.heroControls}>
              <TourismIconAction
                accessibilityLabel="Volver a explorar"
                icon="arrowLeft"
                onPress={() => router.back()}
              />
              <View style={styles.heroControlGroup}>
                <TourismIconAction
                  accessibilityLabel={
                    saved ? "Quitar de guardados" : "Guardar centro turístico"
                  }
                  icon="bookmark"
                  onPress={() => {
                    if (auth.status !== "authenticated") {
                      router.push({
                        pathname: "/login",
                        params: { returnTo: `/centers/${code}` },
                      } as never);
                      return;
                    }
                    savedMutation.mutate({ center, saved });
                  }}
                  selected={saved}
                />
                <TourismIconAction
                  accessibilityLabel={`Compartir ficha de ${center.name}`}
                  icon="share"
                  onPress={() =>
                    void Share.share({
                      message: `${center.name} · ${center.touristZone}`,
                    })
                  }
                />
                <TourismIconAction
                  accessibilityLabel="Cerrar ficha turística"
                  icon="close"
                  onPress={() => router.back()}
                />
              </View>
            </View>
          </View>

          <View style={styles.detailBody}>
            <Text style={[styles.title, { color: colors.text }]}>
              {center.name}
            </Text>
            <CenterRatingSummary
              onPress={() => setActiveTab("opinions")}
              summary={opinions.data?.summary}
            />

            <TourismActionButton
              icon="route"
              label="Cómo llegar"
              onPress={() =>
                router.push({
                  pathname: "/route",
                  params: {
                    destinationLatitude: String(center.latitude),
                    destinationLongitude: String(center.longitude),
                    destinationName: center.name,
                  },
                } as never)
              }
              style={styles.routeButton}
            />

            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
              <TabButton
                active={activeTab === "information"}
                label="Información"
                onPress={() => setActiveTab("information")}
              />
              <TabButton
                active={activeTab === "opinions"}
                label="Opiniones"
                onPress={() => setActiveTab("opinions")}
              />
              <TabButton
                active={activeTab === "photos"}
                label="Fotos"
                onPress={() => setActiveTab("photos")}
              />
            </View>

            {activeTab === "information" ? (
              <InformationTab center={center} />
            ) : activeTab === "photos" ? (
              <PhotosTab photos={center.photos} />
            ) : (
              <OpinionsTab code={center.code} />
            )}
          </View>
        </TourismSurface>
      </ScrollView>
    </TourismScreenFrame>
  );
}

function CenterRatingSummary({
  onPress,
  summary,
}: Readonly<{
  onPress: () => void;
  summary?: OpinionRatingSummary;
}>) {
  const colors = useTurismoPalette();
  if (!summary || summary.averageRating === null || summary.total === 0) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={`${formatRating(summary.averageRating)} de 5 estrellas, ${summary.total} opiniones`}
      accessibilityRole="button"
      hitSlop={turismoMetrics.chipHitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingSummary,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && styles.ratingPressed,
      ]}
    >
      <TurismoIcon color={colors.warm} name="star" size={turismoIconSizes.sm} />
      <Text style={[styles.ratingValue, { color: colors.text }]}>
        {formatRating(summary.averageRating)}
      </Text>
      <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
        ({summary.total} opiniones)
      </Text>
    </Pressable>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: Readonly<{
  active: boolean;
  label: string;
  onPress: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.tabButtonPressed,
        active && { borderBottomColor: colors.primary },
      ]}
    >
      <Text
        style={[
          styles.tabLabel,
          { color: active ? colors.primaryStrong : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InformationTab({ center }: Readonly<{ center: PublicCenterDetail }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.tabContent}>
      {center.description ? (
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {center.description}
        </Text>
      ) : null}
      <DetailSection icon="mapPinned" title="Información del lugar">
        <InfoRow label="Zona turística" value={center.touristZone} />
        <InfoRow label="Categoría" value={center.category} />
        <InfoRow label="Tipo" value={center.type} />
        {center.subtype ? (
          <InfoRow label="Subtipo" value={center.subtype} />
        ) : null}
        {center.address ? (
          <InfoRow label="Dirección" value={center.address} />
        ) : null}
        {center.altitudeMeters !== null ? (
          <InfoRow label="Altitud" value={`${center.altitudeMeters} msnm`} />
        ) : null}
      </DetailSection>
      <DetailSection icon="calendar" title="Ingreso y horario">
        {center.admission ? (
          <>
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
            {center.admission.priceFrom !== null ||
            center.admission.priceTo !== null ? (
              <InfoRow
                label="Precio"
                value={formatPrice(
                  center.admission.priceFrom,
                  center.admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <EmptyStateText text="No hay información de ingreso registrada." />
        )}
      </DetailSection>
      <Tags title="Actividades" values={center.activities} />
      <Tags title="Accesibilidad" values={center.accessibility} />
      <Tags title="Facilidades" values={center.facilities} />
    </View>
  );
}

function OpinionsTab({ code }: Readonly<{ code: string }>) {
  return (
    <View style={styles.tabContent}>
      <CenterOpinions code={code} />
    </View>
  );
}

function PhotosTab({
  photos,
}: Readonly<{ photos: PublicCenterDetail["photos"] }>) {
  const colors = useTurismoPalette();
  if (!photos.length) {
    return (
      <View style={styles.tabContent}>
        <EmptyState
          icon="mapPinned"
          title="Sin fotografías"
          text="Todavía no hay imágenes publicadas para este centro."
        />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View
            key={photo.id}
            style={[styles.photoTile, { backgroundColor: colors.surfaceMuted }]}
          >
            <Image
              accessibilityLabel={
                photo.description ?? "Fotografía del atractivo"
              }
              resizeMethod="resize"
              resizeMode="cover"
              source={{ uri: resolveMediaUrl(photo.url) }}
              style={styles.photoImage}
            />
            {photo.description ? (
              <Text style={[styles.photoCaption, { color: colors.text }]}>
                {photo.description}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function DetailSection({
  children,
  icon,
  title,
}: Readonly<{
  children: ReactNode;
  icon: TurismoIconName;
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

function EmptyState({
  icon,
  text,
  title,
}: Readonly<{
  icon: TurismoIconName;
  text: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <TourismSurface style={styles.emptyState}>
      <TurismoIcon
        color={colors.primaryStrong}
        name={icon}
        size={turismoIconSizes.lg}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {text}
      </Text>
    </TourismSurface>
  );
}

function EmptyStateText({ text }: Readonly<{ text: string }>) {
  const colors = useTurismoPalette();
  return (
    <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
  );
}

function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function formatPrice(from: number | null, to: number | null): string {
  if (from !== null && to !== null && from !== to) return `$${from} – $${to}`;
  const value = from ?? to;
  return value === null ? "No registrado" : `$${value}`;
}

function resolveMediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const api = (
    process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000/api/v1"
  ).replace(/\/$/, "");
  return `${api.replace(/\/api\/v1$/, "")}${path}`;
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  detailCard: {
    borderRadius: turismoRadii.lg,
    overflow: "hidden",
    padding: 0,
  },
  heroMedia: {
    aspectRatio: 1.35,
    position: "relative",
    width: "100%",
  },
  heroImage: { height: "100%", width: "100%" },
  heroFallback: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.sm,
    justifyContent: "center",
  },
  heroFallbackText: { ...turismoTypography.label },
  heroScrim: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  heroControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: turismoSpacing.sm,
    position: "absolute",
    right: turismoSpacing.sm,
    top: turismoSpacing.sm,
  },
  heroControlGroup: { flexDirection: "row", gap: turismoSpacing.xs },
  detailBody: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  title: { ...turismoTypography.title },
  ratingSummary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: turismoRadii.xs,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    minHeight: turismoMetrics.chipHeight,
    paddingHorizontal: turismoSpacing.xs,
  },
  ratingValue: { ...turismoTypography.label },
  ratingCount: { ...turismoTypography.caption },
  ratingPressed: { opacity: 0.72 },
  routeButton: { width: "100%" },
  tabs: {
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.lg,
  },
  tabButton: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: turismoMetrics.borderWidthStrong,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.xs,
  },
  tabButtonPressed: { opacity: 0.72 },
  tabLabel: { ...turismoTypography.label },
  tabContent: { gap: turismoSpacing.md },
  description: { ...turismoTypography.body },
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
  emptyState: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.xl,
  },
  emptyTitle: { ...turismoTypography.heading, textAlign: "center" },
  emptyText: { ...turismoTypography.body, textAlign: "center" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.sm },
  photoTile: {
    borderRadius: turismoRadii.md,
    overflow: "hidden",
    width: "48%",
  },
  photoImage: { aspectRatio: 1.15, width: "100%" },
  photoCaption: {
    ...turismoTypography.caption,
    padding: turismoSpacing.xs,
  },
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
