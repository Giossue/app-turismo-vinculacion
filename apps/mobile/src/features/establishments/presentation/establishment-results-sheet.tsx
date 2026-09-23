import { StyleSheet, Text, View } from "react-native";

import { formatDistance } from "@/core/format/distance";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSheetScrollView } from "@/core/ui/tourism-bottom-sheet";
import { TourismBadge, TourismSurface } from "@/core/ui/tourism-controls";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { NearbyEstablishmentsResult } from "../domain/establishment";

/** Body of the map sheet listing the tourism registry near the tourist. */
export function EstablishmentResultsSheet({
  data,
  error,
  hasLocation,
  isFetching,
  onClose,
  onRequestLocation,
  onRetry,
  query,
}: Readonly<{
  data?: NearbyEstablishmentsResult;
  error: Error | null;
  hasLocation: boolean;
  isFetching: boolean;
  onClose: () => void;
  onRequestLocation: () => void;
  onRetry: () => void;
  query: string;
}>) {
  const colors = useTurismoPalette();
  const effective = data?.effectiveLocality;
  const settled = !isFetching && !error && data;
  return (
    <TourismSheetScrollView
      contentStyle={styles.container}
      landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.query, { color: colors.text }]}>{query}</Text>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            Catastro turístico
          </Text>
        </View>
      </View>

      {!hasLocation ? (
        <TourismStateView
          actionLabel="Usar mi ubicación"
          icon="locate"
          layout="card"
          message="La usamos solo para ordenar el catastro cercano y encontrar la ciudad con resultados."
          onAction={onRequestLocation}
          title="Necesitamos tu ubicación"
          variant="empty"
        />
      ) : null}

      {isFetching ? (
        <TourismStateView
          layout="inline"
          message="Buscando establecimientos…"
          variant="loading"
        />
      ) : null}

      {error ? (
        <TourismStateView
          layout="card"
          message="Conservamos el mapa disponible. Inténtalo de nuevo."
          onAction={onRetry}
          title="No pudimos consultar el catastro."
          variant="error"
        />
      ) : null}

      {settled && data.fallbackApplied && effective ? (
        <TourismSurface style={styles.fallbackCard}>
          <Text style={[styles.fallbackTitle, { color: colors.text }]}>
            Mostramos opciones en {effective.name}
          </Text>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            No encontramos resultados en{" "}
            {data.requestedLocalityName ?? "tu localidad"}. Esta es la ciudad
            más cercana con establecimientos de esta actividad.
          </Text>
          {effective.distanceMeters !== null ? (
            <TourismBadge>
              {formatDistance(effective.distanceMeters)} desde la localidad
              consultada
            </TourismBadge>
          ) : null}
        </TourismSurface>
      ) : null}

      {settled && data.items.length === 0 ? (
        <TourismStateView
          layout="card"
          message="Prueba con otra actividad, por ejemplo alimentación, alojamiento o transporte."
          title={`No encontramos establecimientos con “${query}”.`}
          variant="empty"
        />
      ) : null}

      {data?.items.map((item) => (
        <View
          key={`${item.localityName}-${item.nombreComercial}-${item.direccion ?? ""}`}
          style={[
            styles.resultCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.resultName, { color: colors.text }]}>
            {item.nombreComercial}
          </Text>
          <Text style={[styles.resultMeta, { color: colors.primaryStrong }]}>
            {item.clasificacion ?? item.actividad} · {item.localityName}
          </Text>
          {item.categoria ? (
            <TourismBadge>{item.categoria}</TourismBadge>
          ) : null}
          {item.direccion ? (
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              {item.direccion}
            </Text>
          ) : null}
          {item.distanceMeters !== null ? (
            <TourismBadge>{formatDistance(item.distanceMeters)}</TourismBadge>
          ) : null}
          {item.telefono ? (
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              {item.telefono}
            </Text>
          ) : null}
        </View>
      ))}
    </TourismSheetScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: turismoSpacing.xxs },
  query: { ...turismoTypography.title },
  caption: { ...turismoTypography.caption },
  fallbackCard: { gap: turismoSpacing.xs, padding: turismoSpacing.md },
  fallbackTitle: { ...turismoTypography.heading },
  resultCard: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  resultName: { ...turismoTypography.heading },
  resultMeta: { ...turismoTypography.body },
});
