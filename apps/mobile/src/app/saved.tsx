import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  TourismActionButton,
  TourismIconAction,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import type { SavedCenter } from "@/features/favorites/domain/saved-center";

export default function SavedScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    router.replace({
      pathname: "/login",
      params: { returnTo: "/saved" },
    } as never);
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <TourismScreenFrame onBack={handleBack} title="Guardados">
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Preparando tu cuenta turística…
          </Text>
        </View>
      </TourismScreenFrame>
    );
  }

  return (
    <TourismScreenFrame onBack={handleBack} title="Guardados">
      {savedCenters.isPending ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Cargando tus guardados…
          </Text>
        </View>
      ) : savedCenters.isError ? (
        <View style={styles.state}>
          <TurismoIcon
            color={colors.danger}
            name="wifiOff"
            size={turismoIconSizes.xl}
          />
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            No pudimos abrir tus guardados.
          </Text>
          <TourismActionButton
            icon="refresh"
            label="Reintentar"
            onPress={() => void savedCenters.refetch()}
          />
        </View>
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
                  key={center.code}
                  onOpen={() =>
                    router.push({
                      pathname: "/centers/[code]",
                      params: { code: center.code },
                    } as never)
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
  onOpen,
  onRemove,
}: Readonly<{
  center: SavedCenter;
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
        <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="mapPinned"
            size={turismoIconSizes.md}
          />
        </View>
        <View style={styles.rowCopy}>
          <Text
            numberOfLines={2}
            style={[styles.rowTitle, { color: colors.text }]}
          >
            {center.name}
          </Text>
          <Text style={[styles.rowCategory, { color: colors.primaryStrong }]}>
            {center.category}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            {center.subtype}
          </Text>
        </View>
      </Pressable>
      <TourismIconAction
        accessibilityLabel={`Quitar ${center.name} de guardados`}
        icon="bookmark"
        onPress={onRemove}
        selected
      />
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
  rowIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  rowCopy: { flex: 1, gap: turismoSpacing.xxs },
  rowTitle: { ...turismoTypography.heading },
  rowCategory: { ...turismoTypography.caption, fontWeight: "700" as const },
  rowMeta: { ...turismoTypography.caption },
  pressed: { opacity: 0.72 },
  emptyText: { ...turismoTypography.body, textAlign: "center" },
  state: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  stateTitle: { ...turismoTypography.heading, textAlign: "center" },
  stateText: { ...turismoTypography.body, textAlign: "center" },
});
