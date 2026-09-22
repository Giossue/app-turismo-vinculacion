import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { resolveMediaUrl } from "@/core/api/media-url";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismInfoRow, TourismSection } from "@/core/ui/tourism-content";
import {
  TourismActionButton,
  TourismBadge,
  TourismIconAction,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TourismTabs } from "@/core/ui/tourism-tabs";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import {
  formatAdmissionPrice,
  formatRating,
} from "@/features/centers/domain/center-format";
import type { PublicCenterDetail } from "@/features/centers/domain/public-center";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import type { OpinionRatingSummary } from "@/features/opinions/domain/opinion";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import { buildRouteHref } from "@/features/routing/presentation/route-href";

type CenterTab = "information" | "opinions" | "photos";

const centerTabs = [
  { label: "Información", value: "information" },
  { label: "Opiniones", value: "opinions" },
  { label: "Fotos", value: "photos" },
] as const;

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
      <TourismStateView message="Abriendo ficha turística…" variant="loading" />
    );
  }

  if (!center || error) {
    return (
      <TourismStateView
        onAction={() => void refetch()}
        title="No pudimos abrir la ficha."
        variant="error"
      />
    );
  }

  const heroPhoto = center.photos[0];

  return (
    <TourismScreenFrame
      includeBottomInset={false}
      showHeader={false}
      title="Ficha turística"
    >
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
                  { backgroundColor: colors.map.background },
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
                  filled={saved}
                  icon="bookmark"
                  onPress={() => {
                    if (auth.status !== "authenticated") {
                      router.push(buildLoginHref(`/centers/${center.code}`));
                      return;
                    }
                    savedMutation.mutate({ center, saved });
                  }}
                  selected={saved}
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
              onPress={() => router.push(buildRouteHref(center))}
              style={styles.routeButton}
            />

            <TourismTabs
              items={centerTabs}
              onChange={setActiveTab}
              value={activeTab}
            />

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
  const opinionLabel = summary.total === 1 ? "opinión" : "opiniones";

  return (
    <Pressable
      accessibilityLabel={`${formatRating(summary.averageRating)} de 5 estrellas, ${summary.total} ${opinionLabel}`}
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
        ({summary.total} {opinionLabel})
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
      <TourismSection
        icon="mapPinned"
        title="Información del lugar"
        variant="card"
      >
        <TourismInfoRow label="Zona turística" value={center.touristZone} />
        <TourismInfoRow label="Categoría" value={center.category} />
        <TourismInfoRow label="Tipo" value={center.type} />
        {center.subtype ? (
          <TourismInfoRow label="Subtipo" value={center.subtype} />
        ) : null}
        {center.address ? (
          <TourismInfoRow label="Dirección" value={center.address} />
        ) : null}
        {center.altitudeMeters !== null ? (
          <TourismInfoRow
            label="Altitud"
            value={`${center.altitudeMeters} msnm`}
          />
        ) : null}
      </TourismSection>
      <TourismSection icon="calendar" title="Ingreso y horario" variant="card">
        {center.admission ? (
          <>
            <TourismInfoRow
              label="Acceso"
              value={`${center.admission.type} · ${center.admission.attention}`}
            />
            {center.admission.opensAt || center.admission.closesAt ? (
              <TourismInfoRow
                label="Horario"
                value={`${center.admission.opensAt ?? "--:--"} – ${center.admission.closesAt ?? "--:--"}`}
              />
            ) : null}
            {center.admission.priceFrom !== null ||
            center.admission.priceTo !== null ? (
              <TourismInfoRow
                label="Precio"
                value={formatAdmissionPrice(
                  center.admission.priceFrom,
                  center.admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <EmptyStateText text="No hay información de ingreso registrada." />
        )}
      </TourismSection>
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

function Tags({
  title,
  values,
}: Readonly<{ title: string; values: readonly string[] }>) {
  if (!values.length) return null;
  return (
    <TourismSection title={title} variant="card">
      <View style={styles.tags}>
        {values.map((value) => (
          <TourismBadge key={value}>{value}</TourismBadge>
        ))}
      </View>
    </TourismSection>
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
  ratingPressed: { opacity: turismoOpacity.pressed },
  routeButton: { width: "100%" },
  tabContent: { gap: turismoSpacing.md },
  description: { ...turismoTypography.body },
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
});
