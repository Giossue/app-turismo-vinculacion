import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
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
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";

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
}: Readonly<{
  center: PublicCenter;
  onClose: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
}>) {
  const colors = useTurismoPalette();
  const detailQuery = usePublishedCenter(center.code);
  const opinions = useCenterOpinions(center.code);
  const save = useCenterSaveToggle(center, onRequireAuth);
  const [activeTab, setActiveTab] = useState<CenterDetailTab>("information");
  const detail = detailQuery.data;

  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView
        contentStyle={styles.content}
        landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
      >
        <CenterHero
          name={center.name}
          photo={detail?.photos[0]}
          style={styles.hero}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          {center.name}
        </Text>
        <View style={styles.actions}>
          <CenterRatingSummary
            onPress={() => setActiveTab("opinions")}
            style={styles.rating}
            summary={opinions.data?.summary}
          />
          <Pressable
            accessibilityLabel={save.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: save.saved }}
            hitSlop={turismoSpacing.xxs}
            onPress={save.toggle}
            style={({ pressed }) => [
              styles.saveAction,
              pressed && styles.pressed,
            ]}
          >
            <TurismoIcon
              color={save.saved ? colors.primaryStrong : colors.primary}
              fill={save.saved ? colors.primaryStrong : "none"}
              fillOpacity={save.saved ? 1 : undefined}
              name="bookmark"
              size={turismoIconSizes.md}
            />
          </Pressable>
        </View>
        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
        />
        {detailQuery.isPending ? (
          <TourismStateView
            layout="inline"
            message="Cargando la ficha completa…"
            variant="loading"
          />
        ) : detailQuery.error || !detail ? (
          <TourismStateView
            actionPending={detailQuery.isFetching}
            layout="inline"
            message="No pudimos cargar todos los datos de la ficha."
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
    </TourismBottomSheet>
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
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rating: { alignSelf: "center" },
  saveAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  pressed: { opacity: turismoOpacity.pressed },
});
