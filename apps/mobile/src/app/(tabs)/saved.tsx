import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import {
  useTourismTabBarInset,
  useTourismTabGlassTarget,
} from "@/core/ui/tourism-tab-bar";
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
import type { SavedCenter } from "@/features/favorites/domain/saved-center";
import { SavedCenterErrorSnackbar } from "@/features/favorites/presentation/saved-center-error-snackbar";

export default function SavedScreen() {
  const glassTarget = useTourismTabGlassTarget();
  return (
    <TourismGlassScope
      backdrop={
        <AuthGate returnTo="/saved" tab title="Guardados">
          {() => <SavedCenterList />}
        </AuthGate>
      }
      style={styles.screen}
      targetRef={glassTarget}
    />
  );
}

function SavedCenterList() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();
  const discoveryCatalog = useDiscoveryCatalog();
  const tabBarInset = useTourismTabBarInset();
  const cantonNames = new Map(
    (discoveryCatalog.data?.cantons ?? []).map((canton) => [
      canton.code,
      canton.name,
    ]),
  );

  // A failed background refresh keeps the saved (possibly offline) list.
  if (!savedCenters.data) {
    return savedCenters.isError ? (
      <TourismStateView
        actionPending={savedCenters.isFetching}
        onAction={() => void savedCenters.refetch()}
        title="No pudimos abrir tus guardados."
        variant="error"
      />
    ) : (
      <TourismStateView message="Cargando tus guardados…" variant="loading" />
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: turismoSpacing.xxl + tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {savedCenters.data.length > 0 ? (
          <View style={styles.list}>
            {savedCenters.data.map((center) => (
              <SavedCenterRow
                center={center}
                city={cantonNames.get(center.cantonCode)}
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
              />
            ))}
          </View>
        ) : (
          <>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Abre una ficha turística y toca el marcador para conservarla aquí.
            </Text>
            <TourismActionButton
              icon="map"
              label="Explorar lugares"
              onPress={() => router.back()}
            />
          </>
        )}
      </ScrollView>
      <SavedCenterErrorSnackbar mutation={savedMutation} />
    </>
  );
}

function SavedCenterRow({
  center,
  city,
  onOpen,
  onRemove,
}: Readonly<{
  center: SavedCenter;
  city?: string;
  onOpen: () => void;
  onRemove: () => void;
}>) {
  const colors = useTurismoPalette();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TourismPressable
        accessibilityLabel={`Abrir ${center.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.rowMain}
      >
        <View style={styles.rowCopy}>
          <Text
            numberOfLines={2}
            style={[styles.rowTitle, { color: colors.text }]}
          >
            {center.name}
          </Text>
          {city ? (
            <Text style={[styles.rowCity, { color: colors.textMuted }]}>
              {city}
            </Text>
          ) : null}
        </View>
      </TourismPressable>
      <TourismPressable
        accessibilityLabel={`Quitar ${center.name} de guardados`}
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
  emptyText: { ...turismoTypography.body, textAlign: "center" },
});
