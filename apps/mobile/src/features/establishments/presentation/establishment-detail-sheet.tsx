import { StyleSheet, Text, View } from "react-native";

import { isApiUnavailableError } from "@/core/api/http";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismBadge } from "@/core/ui/tourism-controls";
import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { CenterHero } from "@/features/centers/presentation/center-detail/center-hero";
import { CenterPhotos } from "@/features/centers/presentation/center-detail/center-photos";
import { PlaceActions } from "@/features/favorites/presentation/save-action-button";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { buildEstablishmentTripStop } from "@/features/trip/domain/trip";
import { useTripToggle } from "@/features/trip/presentation/use-trip-toggle";
import { shareEstablishment } from "@/features/sharing/application/share-link";
import { usePublishedEstablishment } from "../application/use-published-establishment";
import {
  getEstablishmentLabel,
  type PublicMapEstablishment,
} from "../domain/establishment";
import { useEstablishmentSaveToggle } from "./use-establishment-save-toggle";
import { useMessages } from "@/core/i18n/use-language";

/**
 * Registry establishment over the map. It opens with the pin data; when the
 * pin carries the registry id it also loads the photos and offers saving.
 * Mount it with `key={getEstablishmentKey(establishment)}`.
 */
export function EstablishmentDetailSheet({
  establishment,
  onClose,
  onOpenRoute,
  onRequireAuth,
}: Readonly<{
  establishment: PublicMapEstablishment;
  onClose: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const categoryLabel = getEstablishmentLabel(establishment);
  const establishmentId = establishment.id;
  const detailQuery = usePublishedEstablishment(establishmentId);
  const detail = detailQuery.data;
  const save = useEstablishmentSaveToggle(establishment, detail, onRequireAuth);
  const trip = useTripToggle(
    buildEstablishmentTripStop({
      id: establishmentId,
      latitude: establishment.latitude,
      longitude: establishment.longitude,
      name: establishment.name,
    }),
  );

  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView contentStyle={styles.container}>
        {detail?.photos.length ? (
          <CenterHero
            name={establishment.name}
            photos={detail.photos}
            style={styles.hero}
          />
        ) : null}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {establishment.name}
            </Text>
            {categoryLabel ? (
              <TourismBadge>{categoryLabel}</TourismBadge>
            ) : null}
          </View>
        </View>

        <TourismInfoRow
          icon="mapPin"
          label={m.places.establishment.location}
          value={
            detail?.direccion ??
            (establishment.approximate
              ? m.places.establishment.approximate
              : m.places.establishment.registeredCoordinates)
          }
        />

        <PlaceActions
          onOpenRoute={onOpenRoute}
          onShare={
            establishmentId === undefined
              ? null
              : () =>
                  void shareEstablishment(establishmentId, establishment.name)
          }
          save={save}
          trip={trip}
        />

        {establishment.id === undefined ? null : detailQuery.isPending &&
          !detailQuery.isPaused ? (
          <TourismStateView
            layout="inline"
            message={m.places.establishment.loadingPhotos}
            variant="loading"
          />
        ) : detail ? (
          <CenterPhotos photos={detail.photos} variant="divided" />
        ) : detailQuery.isPaused ||
          isApiUnavailableError(detailQuery.error) ? null : (
          <TourismStateView
            actionPending={detailQuery.isFetching}
            layout="inline"
            message={m.places.establishment.photosFailed}
            onAction={() => void detailQuery.refetch()}
            variant="error"
          />
        )}
      </TourismSheetScrollView>
      {save ? <SavedCenterErrorSnackbar mutation={save.mutation} /> : null}
    </TourismBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: turismoSpacing.lg,
    paddingBottom: turismoSpacing.xxl,
  },
  hero: { marginHorizontal: -turismoSpacing.lg },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: turismoSpacing.sm },
  title: { ...turismoTypography.heading },
  saveAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  pressed: { opacity: turismoOpacity.pressed },
});
