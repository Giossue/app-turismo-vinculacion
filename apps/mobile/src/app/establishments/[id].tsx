import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { firstSearchParam } from "@/core/navigation/search-params";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton, TourismBadge } from "@/core/ui/tourism-controls";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import {
  buildLoginHref,
  type LoginReturnPath,
} from "@/features/auth/application/login-href";
import { CenterPhotos } from "@/features/centers/presentation/center-detail/center-photos";
import { usePublishedEstablishment } from "@/features/establishments/application/use-published-establishment";
import type {
  PublicEstablishmentDetail,
  PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";
import { useEstablishmentSaveToggle } from "@/features/establishments/presentation/use-establishment-save-toggle";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";
import { buildRouteHref } from "@/features/routing/presentation/route-href";

/**
 * Abre un establecimiento del catastro por su id. Es el destino del código QR
 * que se pega en el local (`/establishments/<id>`).
 */
export default function EstablishmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = firstSearchParam(params.id) ?? "";
  const id = /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  const { data, error, isFetching, isPending, isPaused, refetch } =
    usePublishedEstablishment(id);

  if (id === undefined) {
    return (
      <StateFrame onBack={goBack}>
        <TourismStateView
          message="El código QR no indica qué establecimiento abrir."
          title="No encontramos este establecimiento."
          variant="error"
        />
      </StateFrame>
    );
  }
  if (isPending && !isPaused) {
    return (
      <StateFrame onBack={goBack}>
        <TourismStateView
          message="Abriendo establecimiento…"
          variant="loading"
        />
      </StateFrame>
    );
  }
  if (!data || error) {
    return (
      <StateFrame onBack={goBack}>
        <TourismStateView
          actionPending={isFetching}
          message="Puede que ya no esté publicado o que no tengas conexión."
          onAction={() => void refetch()}
          title="No pudimos abrir el establecimiento."
          variant="error"
        />
      </StateFrame>
    );
  }
  return <EstablishmentContent detail={data} onBack={goBack} />;
}

function StateFrame({
  children,
  onBack,
}: Readonly<{ children: ReactNode; onBack: () => void }>) {
  return (
    <TourismScreenFrame onBack={onBack} title="Establecimiento">
      {children}
    </TourismScreenFrame>
  );
}

function EstablishmentContent({
  detail,
  onBack,
}: Readonly<{ detail: PublicEstablishmentDetail; onBack: () => void }>) {
  const router = useRouter();
  const colors = useTurismoPalette();
  const hasLocation = detail.latitude !== null && detail.longitude !== null;
  const mapEstablishment: PublicMapEstablishment = {
    id: detail.id,
    name: detail.nombreComercial,
    category: detail.categoria,
    categoryLabel: detail.categoriaEtiqueta,
    latitude: detail.latitude ?? 0,
    longitude: detail.longitude ?? 0,
    approximate: false,
    icon: "",
  };
  const save = useEstablishmentSaveToggle(mapEstablishment, detail, () =>
    router.push(
      buildLoginHref(`/establishments/${detail.id}` as LoginReturnPath),
    ),
  );
  const category = detail.categoriaEtiqueta ?? detail.categoria;

  return (
    <TourismScreenFrame
      onBack={onBack}
      title="Establecimiento"
      includeBottomInset={false}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {detail.nombreComercial}
            </Text>
            {category ? <TourismBadge>{category}</TourismBadge> : null}
          </View>
          {save ? (
            <Pressable
              accessibilityLabel={save.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected: save.saved }}
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
        <TourismInfoRow label="Actividad" value={detail.actividad} />
        {detail.clasificacion ? (
          <TourismInfoRow label="Tipo" value={detail.clasificacion} />
        ) : null}
        <TourismInfoRow
          icon="mapPin"
          label="Ubicación"
          value={detail.direccion ?? detail.localityName}
        />
        {detail.telefono ? (
          <TourismInfoRow label="Teléfono" value={detail.telefono} />
        ) : null}
        {hasLocation ? (
          <TourismActionButton
            icon="route"
            label="Cómo llegar"
            onPress={() =>
              router.push(
                buildRouteHref({
                  latitude: detail.latitude as number,
                  longitude: detail.longitude as number,
                  name: detail.nombreComercial,
                }),
              )
            }
          />
        ) : null}
        <CenterPhotos photos={detail.photos} variant="divided" />
      </ScrollView>
      {save ? <SavedCenterErrorSnackbar mutation={save.mutation} /> : null}
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: turismoSpacing.sm },
  title: { ...turismoTypography.title },
  saveAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  pressed: { opacity: turismoOpacity.pressed },
});
