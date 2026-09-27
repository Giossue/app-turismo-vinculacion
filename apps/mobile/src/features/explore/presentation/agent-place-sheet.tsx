import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useEffect, useRef } from "react";
import { BackHandler, Platform, StyleSheet, Text, View } from "react-native";

import { formatOptionalDistance } from "@/core/format/distance";
import { TourismSheetScrollView } from "@/core/ui/tourism-bottom-sheet";
import { TourismActionButton, TourismBadge } from "@/core/ui/tourism-controls";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import { TourismStateView } from "@/core/ui/tourism-state";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import type {
  AgentCard,
  AgentRouteDestination,
} from "@/features/agent/domain/agent";
import type { RouteMode } from "@/features/routing/domain/routing";
import { ExploreCenterSheetContent } from "./explore-center-sheet";

export type AgentPlaceSelection =
  AgentCard | Readonly<{ type: "center-code"; code: string }>;

const placeSheetSnapPoints = ["68%", "100%"];

type AgentPlaceSheetProps = Readonly<{
  selection: AgentPlaceSelection | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
}>;

function PlaceBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.35}
      pressBehavior="close"
    />
  );
}

/** A stacked place sheet: dismissing it reveals the same agent conversation. */
export function AgentPlaceSheet({
  selection,
  onClose,
  onRequireAuth,
  onStartRoute,
}: AgentPlaceSheetProps) {
  const colors = useTurismoPalette();
  const sheetRef = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);

  useEffect(() => {
    const shouldPresent = selection !== null;
    if (shouldPresent === presentedRef.current) return;
    presentedRef.current = shouldPresent;
    if (shouldPresent) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [selection]);

  useEffect(() => {
    if (!selection || Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [selection, onClose]);

  return (
    <BottomSheetModal
      backdropComponent={PlaceBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleComponent={null}
      index={0}
      onDismiss={() => {
        presentedRef.current = false;
        onClose();
      }}
      ref={sheetRef}
      snapPoints={placeSheetSnapPoints}
      stackBehavior="push"
    >
      <BottomSheetView style={styles.sheet}>
        <TourismSheetHandle closeLabel="Volver al agente" onClose={onClose} />
        {selection?.type === "center" || selection?.type === "center-code" ? (
          <AgentCenterDetails
            code={selection.code}
            fallback={selection.type === "center" ? selection : null}
            onRequireAuth={onRequireAuth}
            onStartRoute={onStartRoute}
          />
        ) : selection ? (
          <AgentOtherPlaceDetails
            card={selection}
            onStartRoute={onStartRoute}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function AgentCenterDetails({
  code,
  fallback,
  onRequireAuth,
  onStartRoute,
}: Readonly<{
  code: string;
  fallback: Extract<AgentCard, { type: "center" }> | null;
  onRequireAuth: () => void;
  onStartRoute: AgentPlaceSheetProps["onStartRoute"];
}>) {
  const colors = useTurismoPalette();
  const query = usePublishedCenter(code);

  if (query.data) {
    return (
      <ExploreCenterSheetContent
        center={query.data}
        onOpenRoute={() =>
          onStartRoute(
            {
              type: "center",
              code,
              name: query.data.name,
              latitude: query.data.latitude,
              longitude: query.data.longitude,
            },
            "car",
          )
        }
        onRequireAuth={onRequireAuth}
      />
    );
  }

  return (
    <TourismSheetScrollView contentStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>
        {fallback?.name ?? "Ficha turística"}
      </Text>
      {fallback ? (
        <>
          <TourismBadge>{fallback.category}</TourismBadge>
          <Text style={[styles.body, { color: colors.text }]}>
            {fallback.summary}
          </Text>
          <TourismActionButton
            icon="route"
            label="Cómo llegar"
            onPress={() =>
              onStartRoute(
                {
                  type: "center",
                  code,
                  name: fallback.name,
                  latitude: fallback.latitude,
                  longitude: fallback.longitude,
                },
                "car",
              )
            }
          />
        </>
      ) : null}
      <TourismStateView
        actionPending={query.isFetching}
        layout="inline"
        message={
          query.error
            ? "No pudimos cargar la ficha completa."
            : "Cargando la ficha completa…"
        }
        onAction={query.error ? () => void query.refetch() : undefined}
        variant={query.error ? "error" : "loading"}
      />
    </TourismSheetScrollView>
  );
}

function AgentOtherPlaceDetails({
  card,
  onStartRoute,
}: Readonly<{
  card: Exclude<AgentCard, { type: "center" }>;
  onStartRoute: AgentPlaceSheetProps["onStartRoute"];
}>) {
  const colors = useTurismoPalette();
  const distance = formatOptionalDistance(card.distanceMeters);
  const destination: AgentRouteDestination | null =
    card.latitude !== null && card.longitude !== null
      ? {
          type: card.type,
          name: card.name,
          latitude: card.latitude,
          longitude: card.longitude,
        }
      : null;

  return (
    <TourismSheetScrollView contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>{card.name}</Text>
        {card.category ? <TourismBadge>{card.category}</TourismBadge> : null}
      </View>
      <Text style={[styles.body, { color: colors.text }]}>{card.summary}</Text>
      <TourismInfoRow
        icon="mapPin"
        label="Localidad"
        value={card.localityName}
      />
      {distance ? (
        <TourismInfoRow icon="locate" label="Distancia" value={distance} />
      ) : null}
      {card.type === "establishment" && card.address ? (
        <TourismInfoRow icon="mapPin" label="Dirección" value={card.address} />
      ) : null}
      {card.type === "establishment" && card.phone ? (
        <TourismInfoRow label="Teléfono" value={card.phone} />
      ) : null}
      {destination ? (
        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={() => onStartRoute(destination, "car")}
        />
      ) : (
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Este lugar no tiene una ubicación precisa para crear una ruta.
        </Text>
      )}
    </TourismSheetScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, minHeight: 0 },
  content: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  heading: { alignItems: "flex-start", gap: turismoSpacing.sm },
  title: { ...turismoTypography.heading },
  body: { ...turismoTypography.bodySmall },
});
