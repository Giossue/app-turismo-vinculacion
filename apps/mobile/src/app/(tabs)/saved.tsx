import { useRouter } from "expo-router";
import { SectionList, StyleSheet, Text, View } from "react-native";

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
import { useMessages } from "@/core/i18n/use-language";

export default function SavedScreen() {
  const m = useMessages();
  return (
    <TourismGlassScope
      backdrop={
        <AuthGate returnTo="/saved" tab title={m.community.saved.title}>
          {() => <SavedCenterList />}
        </AuthGate>
      }
      style={styles.screen}
    />
  );
}

function SavedCenterList() {
  const m = useMessages();
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
    const paused = savedCenters.isPaused || savedEstablishments.isPaused;
    const failed =
      savedCenters.isError || savedEstablishments.isError || paused;
    return failed ? (
      <TourismStateView
        actionPending={
          savedCenters.isFetching || savedEstablishments.isFetching
        }
        onAction={() => {
          if (!savedCenters.data) void savedCenters.refetch();
          if (!savedEstablishments.data) void savedEstablishments.refetch();
        }}
        title={m.community.saved.openFailed}
        message={paused ? m.community.saved.offline : undefined}
        variant="error"
      />
    ) : (
      <TourismStateView message={m.community.saved.loading} variant="loading" />
    );
  }

  const centers = savedCenters.data;
  const establishments = savedEstablishments.data;
  if (centers.length === 0 && establishments.length === 0) {
    return (
      <>
        <TourismStateView
          actionIcon="map"
          actionLabel={m.community.saved.explore}
          icon="bookmark"
          message={m.community.saved.emptyHint}
          onAction={() => router.replace("/")}
          title={m.community.saved.emptyTitle}
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
      <SectionList
        sections={[
          {
            title: m.community.saved.centers,
            data: centers.map((center) => ({
              key: `center:${center.code}`,
              title: center.name,
              subtitle: cantonNames.get(center.cantonCode),
              onOpen: () =>
                router.push({
                  pathname: "/centers/[code]",
                  params: { code: center.code },
                }),
              onRemove: () =>
                savedMutation.mutate({ center, currentlySaved: true }),
            })),
          },
          {
            title: m.community.saved.establishments,
            data: establishments.map((establishment) => ({
              key: `establishment:${establishment.id}`,
              title: establishment.nombreComercial,
              subtitle:
                [
                  establishment.categoriaEtiqueta ??
                    establishment.clasificacion ??
                    establishment.actividad,
                  establishment.localityName,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined,
              onOpen:
                establishment.latitude === null ||
                establishment.longitude === null
                  ? undefined
                  : () =>
                      router.replace({
                        pathname: "/",
                        params: { establishmentId: String(establishment.id) },
                      }),
              onRemove: () =>
                establishmentMutation.mutate({
                  establishment,
                  currentlySaved: true,
                }),
            })),
          },
        ].filter((section) => section.data.length > 0)}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <SavedPlaceRow {...item} />}
        renderSectionHeader={({ section }) =>
          showHeadings ? (
            <TourismSectionTitle>{section.title}</TourismSectionTitle>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: turismoSpacing.xxl + tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}
      />
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
  const m = useMessages();
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
          accessibilityLabel={m.community.saved.open(title)}
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
        accessibilityLabel={m.community.saved.remove(title)}
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
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  separator: { height: turismoSpacing.sm },
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
