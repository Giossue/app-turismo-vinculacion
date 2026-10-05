import { Pressable, StyleSheet, Text, View } from "react-native";

import { isApiUnavailableError } from "@/core/api/http";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton, TourismBadge } from "@/core/ui/tourism-controls";
import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { CenterPhotos } from "@/features/centers/presentation/center-detail/center-photos";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { usePublishedEstablishment } from "../application/use-published-establishment";
import {
  getEstablishmentLabel,
  type PublicMapEstablishment,
} from "../domain/establishment";
import { useEstablishmentSaveToggle } from "./use-establishment-save-toggle";

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
  const colors = useTurismoPalette();
  const categoryLabel = getEstablishmentLabel(establishment);
  const detailQuery = usePublishedEstablishment(establishment.id);
  const detail = detailQuery.data;
  const save = useEstablishmentSaveToggle(establishment, detail, onRequireAuth);

  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView contentStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {establishment.name}
            </Text>
            {categoryLabel ? (
              <TourismBadge>{categoryLabel}</TourismBadge>
            ) : null}
          </View>
          {save ? (
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
          ) : null}
        </View>

        <TourismInfoRow
          icon="mapPin"
          label="Ubicación"
          value={
            detail?.direccion ??
            (establishment.approximate
              ? "Punto de referencia aproximado"
              : "Coordenadas registradas")
          }
        />

        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
        />

        {establishment.id === undefined ? null : detailQuery.isPending ? (
          <TourismStateView
            layout="inline"
            message="Cargando fotografías…"
            variant="loading"
          />
        ) : detail ? (
          <CenterPhotos photos={detail.photos} variant="divided" />
        ) : isApiUnavailableError(detailQuery.error) ? null : (
          <TourismStateView
            actionPending={detailQuery.isFetching}
            layout="inline"
            message="No pudimos cargar las fotografías."
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
