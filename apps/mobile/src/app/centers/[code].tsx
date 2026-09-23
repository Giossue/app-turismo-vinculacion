import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { firstSearchParam } from "@/core/navigation/search-params";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismIconAction,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import type { PublicCenterDetail } from "@/features/centers/domain/public-center";
import {
  CenterDetailTabs,
  type CenterDetailTab,
} from "@/features/centers/presentation/center-detail/center-detail-tabs";
import { CenterHero } from "@/features/centers/presentation/center-detail/center-hero";
import { CenterInformation } from "@/features/centers/presentation/center-detail/center-information";
import { CenterPhotos } from "@/features/centers/presentation/center-detail/center-photos";
import { CenterRatingSummary } from "@/features/centers/presentation/center-detail/center-rating-summary";
import { useCenterSaveToggle } from "@/features/centers/presentation/center-detail/use-center-save-toggle";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import { buildRouteHref } from "@/features/routing/presentation/route-href";

export default function CenterDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = firstSearchParam(params.code) ?? "";
  const goBack = () => router.back();
  const {
    data: center,
    error,
    isFetching,
    isPending,
    refetch,
  } = usePublishedCenter(code);

  if (!code) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView
          message="El enlace no indica qué atractivo abrir."
          title="No encontramos esta ficha."
          variant="error"
        />
      </CenterStateFrame>
    );
  }

  if (isPending) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView
          message="Abriendo ficha turística…"
          variant="loading"
        />
      </CenterStateFrame>
    );
  }

  if (!center || error) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView
          actionPending={isFetching}
          onAction={() => void refetch()}
          title="No pudimos abrir la ficha."
          variant="error"
        />
      </CenterStateFrame>
    );
  }

  return <CenterDetailContent center={center} onBack={goBack} />;
}

/** Loading and error states keep a header so iOS users can always go back. */
function CenterStateFrame({
  children,
  onBack,
}: Readonly<{ children: ReactNode; onBack: () => void }>) {
  return (
    <TourismScreenFrame onBack={onBack} title="Ficha turística">
      {children}
    </TourismScreenFrame>
  );
}

function CenterDetailContent({
  center,
  onBack,
}: Readonly<{ center: PublicCenterDetail; onBack: () => void }>) {
  const router = useRouter();
  const colors = useTurismoPalette();
  const [activeTab, setActiveTab] = useState<CenterDetailTab>("information");
  const opinions = useCenterOpinions(center.code);
  const save = useCenterSaveToggle(center, () =>
    router.push(buildLoginHref(`/centers/${center.code}`)),
  );

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
          <CenterHero
            leading={
              <TourismIconAction
                accessibilityLabel="Volver a explorar"
                icon="arrowLeft"
                onPress={onBack}
              />
            }
            name={center.name}
            photo={center.photos[0]}
            trailing={
              <TourismIconAction
                accessibilityLabel={save.accessibilityLabel}
                filled={save.saved}
                icon="bookmark"
                onPress={save.toggle}
                selected={save.saved}
              />
            }
          />
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
            <CenterDetailTabs onChange={setActiveTab} value={activeTab} />
            {activeTab === "information" ? (
              <CenterInformation detail={center} variant="card" />
            ) : activeTab === "photos" ? (
              <CenterPhotos photos={center.photos} variant="card" />
            ) : (
              <CenterOpinions code={center.code} />
            )}
          </View>
        </TourismSurface>
      </ScrollView>
      <SavedCenterErrorSnackbar mutation={save.mutation} />
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
  detailCard: { overflow: "hidden", padding: 0 },
  detailBody: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  title: { ...turismoTypography.title },
  routeButton: { width: "100%" },
});
