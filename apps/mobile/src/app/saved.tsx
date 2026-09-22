import { useCallback, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import type { SavedCenter } from "@/features/favorites/domain/saved-center";

export default function SavedScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();
  const discoveryCatalog = useDiscoveryCatalog();
  const cantonNames = useMemo(
    () =>
      new Map(
        (discoveryCatalog.data?.cantons ?? []).map((canton) => [
          canton.code,
          canton.name,
        ]),
      ),
    [discoveryCatalog.data?.cantons],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    router.replace(buildLoginHref("/saved"));
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <TourismScreenFrame onBack={handleBack} title="Guardados">
        <TourismStateView
          message="Preparando tu cuenta turística…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }

  return (
    <TourismScreenFrame onBack={handleBack} title="Guardados">
      {savedCenters.isPending ? (
        <TourismStateView message="Cargando tus guardados…" variant="loading" />
      ) : savedCenters.isError ? (
        <TourismStateView
          actionPending={savedCenters.isFetching}
          onAction={() => void savedCenters.refetch()}
          title="No pudimos abrir tus guardados."
          variant="error"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
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
                  onRemove={() => savedMutation.mutate({ center, saved: true })}
                />
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Abre una ficha turística y toca el marcador para conservarla
                aquí.
              </Text>
              <TourismActionButton
                icon="map"
                label="Explorar lugares"
                onPress={handleBack}
              />
            </>
          )}
        </ScrollView>
      )}
    </TourismScreenFrame>
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
      <Pressable
        accessibilityLabel={`Abrir ${center.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
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
      </Pressable>
      <Pressable
        accessibilityLabel={`Quitar ${center.name} de guardados`}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        hitSlop={10}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeAction,
          pressed && styles.pressed,
        ]}
      >
        <TurismoIcon
          color={colors.primaryStrong}
          fill={colors.primaryStrong}
          fillOpacity={1}
          name="bookmark"
          size={turismoIconSizes.md}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: { opacity: turismoOpacity.pressed },
  emptyText: { ...turismoTypography.body, textAlign: "center" },
});
