import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { formatDistance } from "@/core/format/distance";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { NearbyEstablishmentsResult } from "../domain/establishment";

export function EstablishmentResultsSheet({
  data,
  error,
  hasLocation,
  isFetching,
  onRequestLocation,
  onRetry,
  query,
}: Readonly<{
  data?: NearbyEstablishmentsResult;
  error: Error | null;
  hasLocation: boolean;
  isFetching: boolean;
  onRequestLocation: () => void;
  onRetry: () => void;
  query: string;
}>) {
  const colors = useTurismoPalette();
  const effective = data?.effectiveLocality;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.query, { color: colors.text }]}>{query}</Text>
          <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
            Catastro turístico
          </Text>
        </View>
      </View>

      {!hasLocation ? (
        <TourismSurface style={styles.statusCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="locate"
            size={turismoIconSizes.lg}
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            Necesitamos tu ubicación
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            La usamos solo para ordenar el catastro cercano y encontrar la
            ciudad con resultados.
          </Text>
          <TourismActionButton
            icon="locate"
            label="Usar mi ubicación"
            mode="outlined"
            onPress={onRequestLocation}
          />
        </TourismSurface>
      ) : null}

      {isFetching ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Buscando establecimientos…
          </Text>
        </View>
      ) : null}

      {error ? (
        <TourismSurface style={styles.statusCard}>
          <TurismoIcon
            color={colors.danger}
            name="wifiOff"
            size={turismoIconSizes.md}
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            No pudimos consultar el catastro.
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Conservamos el mapa disponible. Inténtalo de nuevo.
          </Text>
          <TourismActionButton
            icon="refresh"
            label="Reintentar"
            mode="outlined"
            onPress={onRetry}
          />
        </TourismSurface>
      ) : null}

      {!isFetching && !error && data && data.fallbackApplied && effective ? (
        <TourismSurface
          style={[styles.fallbackCard, { borderColor: colors.border }]}
        >
          <Text style={[styles.fallbackTitle, { color: colors.text }]}>
            Mostramos opciones en {effective.name}
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
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

      {!isFetching && !error && data && data.items.length === 0 ? (
        <TourismSurface style={styles.statusCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="search"
            size={turismoIconSizes.lg}
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            No encontramos establecimientos con “{query}”.
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Prueba con otra actividad, por ejemplo alimentación, alojamiento o
            transporte.
          </Text>
        </TourismSurface>
      ) : null}

      {data?.items.map((item) => (
        <View
          key={`${item.localityName}-${item.nombreComercial}-${item.direccion ?? ""}`}
          style={[
            styles.resultCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
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
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {item.direccion}
            </Text>
          ) : null}
          {item.distanceMeters !== null ? (
            <TourismBadge>{formatDistance(item.distanceMeters)}</TourismBadge>
          ) : null}
          {item.telefono ? (
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {item.telefono}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xl },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: turismoSpacing.xxs },
  query: { ...turismoTypography.title },
  resultLabel: { ...turismoTypography.caption },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingVertical: turismoSpacing.sm,
  },
  statusCard: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.lg,
  },
  fallbackCard: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  fallbackTitle: { ...turismoTypography.heading },
  statusTitle: { ...turismoTypography.heading, textAlign: "center" },
  statusText: { ...turismoTypography.caption, textAlign: "center" },
  resultCard: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  resultName: { ...turismoTypography.heading },
  resultMeta: { ...turismoTypography.body },
});
