import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import { CenterDetailPager } from "@/features/centers/presentation/center-detail/center-detail-pager";
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
import { buildCenterTripStop } from "@/features/trip/domain/trip";
import { useTripToggle } from "@/features/trip/presentation/use-trip-toggle";
import { shareCenter } from "@/features/sharing/application/share-link";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import { useMessages } from "@/core/i18n/use-language";

/**
 * Quick center sheet over the map. It opens with the map data and loads the
 * full detail (photos, admission, tags) in the background. Mount it with
 * `key={center.code}` so a rotation keeps the tab and any opinion draft.
 */
export function ExploreCenterSheet({
  center,
  onClose,
  onOpenRoute,
  onRequireAuth,
}: ExploreCenterSheetProps) {
  return (
    <TourismBottomSheet onClose={onClose}>
      <ExploreCenterSheetContent
        center={center}
        onOpenRoute={onOpenRoute}
        onRequireAuth={onRequireAuth}
      />
    </TourismBottomSheet>
  );
}

type ExploreCenterSheetProps = Readonly<{
  center: PublicCenter;
  onClose: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
}>;

/** Shared public-center content for the map and the agent's detail sheet. */
export function ExploreCenterSheetContent({
  center,
  onOpenRoute,
  onRequireAuth,
}: Omit<ExploreCenterSheetProps, "onClose">) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const detailQuery = usePublishedCenter(center.code);
  const opinions = useCenterOpinions(center.code);
  const save = useCenterSaveToggle(center, onRequireAuth);
  const trip = useTripToggle(buildCenterTripStop(center));
  const [activeTab, setActiveTab] = useState<CenterDetailTab>("information");
  const detail = detailQuery.data;

  return (
    <>
      <TourismSheetScrollView
        contentStyle={styles.content}
        landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
      >
        <CenterHero
          name={center.name}
          photos={detail?.photos}
          style={styles.hero}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          {center.name}
        </Text>
        <CenterRatingSummary
          onPress={() => setActiveTab("opinions")}
          style={styles.rating}
          summary={opinions.data?.summary}
        />
        <PlaceActions
          onOpenRoute={onOpenRoute}
          onShare={() => void shareCenter(center.code, center.name)}
          save={save}
          trip={trip}
        />
        {detailQuery.isPending && !detailQuery.isPaused ? (
          <TourismStateView
            layout="inline"
            message={m.explore.centerSheet.loading}
            variant="loading"
          />
        ) : detailQuery.error || !detail ? (
          <TourismStateView
            actionPending={detailQuery.isFetching}
            layout="inline"
            message={m.explore.centerSheet.failed}
            onAction={() => void detailQuery.refetch()}
            variant="error"
          />
        ) : (
          <>
            <CenterDetailTabs onChange={setActiveTab} value={activeTab} />
            <CenterDetailPager
              onChange={setActiveTab}
              renderPage={(tab) =>
                tab === "information" ? (
                  <CenterInformation detail={detail} variant="divided" />
                ) : tab === "opinions" ? (
                  <CenterOpinions
                    active={activeTab === "opinions"}
                    code={center.code}
                    onRequireAuth={onRequireAuth}
                  />
                ) : (
                  <CenterPhotos photos={detail.photos} variant="divided" />
                )
              }
              value={activeTab}
            />
          </>
        )}
      </TourismSheetScrollView>
      <SavedCenterErrorSnackbar mutation={save.mutation} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom:
      turismoSpacing.xxl + turismoMetrics.iconButtonLg + turismoSpacing.xl,
    paddingTop: 0,
  },
  hero: { marginHorizontal: -turismoSpacing.lg },
  title: { ...turismoTypography.title },
  rating: { alignSelf: "center" },
});
