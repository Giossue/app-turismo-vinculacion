import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSectionTitle } from "@/core/ui/tourism-controls";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import { useTourismTabBarInset } from "@/core/ui/tourism-tab-bar";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { AuthGate } from "@/features/auth/presentation/auth-gate";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import {
  useSavedEstablishmentMutation,
  useSavedEstablishments,
} from "@/features/favorites/application/use-saved-establishments";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";

export default function SavedScreen() {
  return (
    <TourismGlassScope
      backdrop={
        <AuthGate returnTo="/saved" tab title="Guardados">
          {() => <SavedCenterList />}
        </AuthGate>
      }
      style={styles.screen}
    />
  );
}

function SavedCenterList() {
  const router = useRouter();
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();
  const savedEstablishments = useSavedEstablishments();
  const establishmentMutation = useSavedEstablishmentMutation();
  const discoveryCatalog = useDiscoveryCatalog();
  const tabBarInset = useTourismTabBarInset();
  const cantonNames = new Map(
    (discoveryCatalog.data?.cantons ?? []).map((canton) => [
      canton.code,
      canton.name,
    ]),
  );
  // Both mutations share one snackbar: the latest failure is the one shown.
  const failedMutation = establishmentMutation.error
    ? establishmentMutation
    : savedMutation;

  // A failed background refresh keeps the saved (possibly offline) lists.
  if (!savedCenters.data || !savedEstablishments.data) {
    const failed = savedCenters.isError || savedEstablishments.isError;
    return failed ? (
      <TourismStateView
        actionPending={
          savedCenters.isFetching || savedEstablishments.isFetching
        }
        onAction={() => {
          if (!savedCenters.data) void savedCenters.refetch();
          if (!savedEstablishments.data) void savedEstablishments.refetch();
        }}
        title="No pudimos abrir tus guardados."
        variant="error"
      />
    ) : (
      <TourismStateView message="Cargando tus guardados…" variant="loading" />
    );
  }

  const centers = savedCenters.data;
  const establishments = savedEstablishments.data;
  if (centers.length === 0 && establishments.length === 0) {
    return (
      <>
        <TourismStateView
          actionIcon="map"
          actionLabel="Explorar"
          icon="bookmark"
          message="Abre una ficha turística y toca el marcador para conservarla aquí."
          onAction={() => router.replace("/")}
          title="Aún no tienes guardados"
          variant="empty"
        />
        <SavedCenterErrorSnackbar mutation={failedMutation} />
      </>
    );
  }
  // Headings only help when both kinds of places are listed.
  const showHeadings = centers.length > 0 && establishments.length > 0;

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: turismoSpacing.xxl + tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {centers.length > 0 ? (
          <View style={styles.list}>
            {showHeadings ? (
              <TourismSectionTitle>Centros turísticos</TourismSectionTitle>
            ) : null}
            {centers.map((center) => (
              <SavedPlaceRow
                key={center.code}
                onOpen={() =>
                  router.push({
                    pathname: "/centers/[code]",
                    params: { code: center.code },
                  })
                }
                onRemove={() =>
                  savedMutation.mutate({ center, currentlySaved: true })
                }
                subtitle={cantonNames.get(center.cantonCode)}
                title={center.name}
              />
            ))}
          </View>
        ) : null}
        {establishments.length > 0 ? (
          <View style={styles.list}>
            {showHeadings ? (
              <TourismSectionTitle>Establecimientos</TourismSectionTitle>
            ) : null}
            {establishments.map((establishment) => (
              <SavedPlaceRow
                key={establishment.id}
                // Explorar is a tab: it is replaced, and it focuses the
                // establishment on the map before opening its sheet.
                onOpen={
                  establishment.latitude === null ||
                  establishment.longitude === null
                    ? undefined
                    : () =>
                        router.replace({
                          pathname: "/",
                          params: { establishmentId: String(establishment.id) },
                        })
                }
                onRemove={() =>
                  establishmentMutation.mutate({
                    establishment,
                    currentlySaved: true,
                  })
                }
                subtitle={
                  [
                    establishment.categoriaEtiqueta ??
                      establishment.clasificacion ??
                      establishment.actividad,
                    establishment.localityName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                title={establishment.nombreComercial}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <SavedCenterErrorSnackbar mutation={failedMutation} />
    </>
  );
}

function SavedPlaceRow({
  onOpen,
  onRemove,
  subtitle,
  title,
}: Readonly<{
  /** Absent when the place cannot be shown on the map. */
  onOpen?: () => void;
  onRemove: () => void;
  subtitle?: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  const copy = (
    <View style={styles.rowCopy}>
      <Text numberOfLines={2} style={[styles.rowTitle, { color: colors.text }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.rowCity, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {onOpen ? (
        <TourismPressable
          accessibilityLabel={`Abrir ${title}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={styles.rowMain}
        >
          {copy}
        </TourismPressable>
      ) : (
        <View style={styles.rowMain}>{copy}</View>
      )}
      <TourismPressable
        accessibilityLabel={`Quitar ${title} de guardados`}
        accessibilityRole="button"
        borderlessRipple
        hitSlop={turismoSpacing.xs}
        onPress={onRemove}
        style={styles.removeAction}
      >
        <TurismoIcon
          color={colors.primaryStrong}
          fill={colors.primaryStrong}
          fillOpacity={1}
          name="bookmark"
          size={turismoIconSizes.md}
        />
      </TourismPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  list: { gap: turismoSpacing.sm },
  row: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    minHeight: turismoMetrics.iconButtonLg,
    overflow: "hidden",
    padding: turismoSpacing.sm,
  },
  rowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
  },
  rowCopy: { flex: 1, gap: turismoSpacing.xxs },
  rowTitle: { ...turismoTypography.heading },
  rowCity: { ...turismoTypography.caption },
  removeAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
});
