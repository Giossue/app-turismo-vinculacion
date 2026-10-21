import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { firstSearchParam } from "@/core/navigation/search-params";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismIconAction, TourismSurface } from "@/core/ui/tourism-controls";
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
import { PlaceActions } from "@/features/favorites/presentation/save-action-button";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import { buildRouteHref } from "@/features/routing/presentation/route-href";
import { shareCenter } from "@/features/sharing/application/share-link";
import { isValidCenterCode } from "@/features/sharing/domain/share-links";
import { useMessages } from "@/core/i18n/use-language";

export default function CenterDetailScreen() {
  const m = useMessages();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    tab?: string | string[];
  }>();
  // El código puede llegar desde un enlace compartido: solo se aceptan
  // códigos alfanuméricos antes de consultar la API.
  const rawCode = firstSearchParam(params.code) ?? "";
  const code = isValidCenterCode(rawCode) ? rawCode : "";
  // Al llegar a un destino, «Opinar» abre la ficha en su pestaña de opiniones.
  const initialTab: CenterDetailTab =
    firstSearchParam(params.tab) === "opinions" ? "opinions" : "information";
  // Abierta desde un enlace compartido no hay pantalla previa: vuelve al mapa.
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  const {
    data: center,
    error,
    isFetching,
    isPending,
    isPaused,
    refetch,
  } = usePublishedCenter(code);

  if (!code) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView
          message={m.places.center.missingCode}
          title={m.places.center.notFound}
          variant="error"
        />
      </CenterStateFrame>
    );
  }

  if (isPending && !isPaused) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView message={m.places.center.opening} variant="loading" />
      </CenterStateFrame>
    );
  }

  if (!center || error) {
    return (
      <CenterStateFrame onBack={goBack}>
        <TourismStateView
          actionPending={isFetching}
          onAction={() => void refetch()}
          title={m.places.center.openFailed}
          variant="error"
        />
      </CenterStateFrame>
    );
  }

  return (
    <CenterDetailContent
      center={center}
      initialTab={initialTab}
      onBack={goBack}
    />
  );
}

/** Loading and error states keep a header so iOS users can always go back. */
function CenterStateFrame({
  children,
  onBack,
}: Readonly<{ children: ReactNode; onBack: () => void }>) {
  const m = useMessages();
  return (
    <TourismScreenFrame onBack={onBack} title={m.places.center.title}>
      {children}
    </TourismScreenFrame>
  );
}

function CenterDetailContent({
  center,
  initialTab,
  onBack,
}: Readonly<{
  center: PublicCenterDetail;
  initialTab: CenterDetailTab;
  onBack: () => void;
}>) {
  const m = useMessages();
  const router = useRouter();
  const colors = useTurismoPalette();
  const [activeTab, setActiveTab] = useState<CenterDetailTab>(initialTab);
  const opinions = useCenterOpinions(center.code);
  const save = useCenterSaveToggle(center, () =>
    router.push(buildLoginHref(`/centers/${center.code}`)),
  );

  return (
    <TourismScreenFrame
      includeBottomInset={false}
      showHeader={false}
      title={m.places.center.title}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.detailCard}>
          <CenterHero
            leading={
              <TourismIconAction
                accessibilityLabel={m.places.center.backToExplore}
                icon="arrowLeft"
                onPress={onBack}
              />
            }
            name={center.name}
            photos={center.photos}
          />
          <View style={styles.detailBody}>
            <Text style={[styles.title, { color: colors.text }]}>
              {center.name}
            </Text>
            <CenterRatingSummary
              onPress={() => setActiveTab("opinions")}
              summary={opinions.data?.summary}
            />
            <PlaceActions
              onOpenRoute={() =>
                router.push(
                  buildRouteHref({
                    ...center,
                    place: { kind: "center", code: center.code },
                  }),
                )
              }
              onShare={() => void shareCenter(center.code, center.name)}
              save={save}
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
});
