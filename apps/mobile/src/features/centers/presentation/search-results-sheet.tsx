import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  TourismActionButton,
  TourismBadge,
  TourismChoiceChip,
  TourismIconAction,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { UserLocationCoordinate } from "@/core/location/use-user-location";
import type { DiscoveryCatalog, PublicCenter } from "../domain/public-center";
import {
  AdvancedDiscoveryFilters,
  type DiscoveryFilterValues,
} from "./discovery-filters";

export function SearchResultsSheet({
  catalog,
  centers,
  error,
  filters,
  isFetching,
  isPlaceholderData,
  nearbyOnly,
  onChangeFilters,
  onClear,
  onNearbyToggle,
  onRetry,
  onSelectCenter,
  onToggleFilters,
  query,
  showFilters,
  userLocation,
}: Readonly<{
  catalog?: DiscoveryCatalog;
  centers: readonly PublicCenter[];
  error: Error | null;
  filters: DiscoveryFilterValues;
  isFetching: boolean;
  isPlaceholderData: boolean;
  nearbyOnly: boolean;
  onChangeFilters: (filters: DiscoveryFilterValues) => void;
  onClear: () => void;
  onNearbyToggle: () => void;
  onRetry: () => void;
  onSelectCenter: (center: PublicCenter) => void;
  onToggleFilters: () => void;
  query: string;
  showFilters: boolean;
  userLocation: UserLocationCoordinate | null;
}>) {
  const colors = useTurismoPalette();
  const sortedCenters = useMemo(() => {
    if (!nearbyOnly || !userLocation) return centers;
    return [...centers].sort(
      (left, right) =>
        distanceMeters(left, userLocation) -
        distanceMeters(right, userLocation),
    );
  }, [centers, nearbyOnly, userLocation]);
  const showResults = !isFetching && !isPlaceholderData && !error;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.query, { color: colors.text }]}>{query}</Text>
          <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
            Atractivos turísticos publicados
          </Text>
        </View>
        <TourismIconAction
          accessibilityLabel="Limpiar búsqueda y cerrar resultados"
          icon="close"
          onPress={onClear}
        />
      </View>

      <ScrollView
        accessibilityLabel="Filtros de búsqueda turística"
        contentContainerStyle={styles.filterChips}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <TourismChoiceChip
          label="Filtros"
          onPress={onToggleFilters}
          selected={showFilters}
        />
        <TourismChoiceChip
          label="Todo"
          onPress={() =>
            onChangeFilters({ ...filters, categoryCode: undefined })
          }
          selected={!filters.categoryCode}
        />
        {(catalog?.categories ?? []).map((category) => (
          <TourismChoiceChip
            key={category.code}
            label={category.name}
            onPress={() =>
              onChangeFilters({
                ...filters,
                categoryCode: category.code,
                typeCode: undefined,
                subtypeCode: undefined,
              })
            }
            selected={filters.categoryCode === category.code}
          />
        ))}
        {userLocation ? (
          <TourismChoiceChip
            label="Cerca de mí"
            onPress={onNearbyToggle}
            selected={nearbyOnly}
          />
        ) : null}
      </ScrollView>

      {showFilters ? (
        <AdvancedDiscoveryFilters
          catalog={catalog}
          filters={filters}
          onChange={onChangeFilters}
          onClose={onToggleFilters}
        />
      ) : null}

      {isFetching || isPlaceholderData ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Buscando atractivos turísticos…
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
            No pudimos actualizar la búsqueda.
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

      {showResults && sortedCenters.length === 0 ? (
        <TourismSurface style={styles.statusCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="search"
            size={turismoIconSizes.lg}
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            No encontramos atractivos con “{query}”.
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Prueba con otro nombre, categoría o tipo de atractivo.
          </Text>
        </TourismSurface>
      ) : null}

      {showResults ? (
        <View style={styles.resultsList}>
          {sortedCenters.map((center) => (
            <SearchResultCard
              center={center}
              distance={
                userLocation ? distanceMeters(center, userLocation) : null
              }
              key={center.code}
              onPress={() => onSelectCenter(center)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SearchResultCard({
  center,
  distance,
  onPress,
}: Readonly<{
  center: PublicCenter;
  distance: number | null;
  onPress: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel={`Ver resultado ${center.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text style={[styles.resultCategory, { color: colors.primaryStrong }]}>
        {center.category}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.resultName, { color: colors.text }]}
      >
        {center.name}
      </Text>
      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
        {center.type} · {center.subtype}
      </Text>
      <View style={styles.resultTags}>
        {center.hierarchy ? (
          <TourismBadge>Jerarquía {center.hierarchy}</TourismBadge>
        ) : null}
        {distance !== null ? (
          <TourismBadge>{formatDistance(distance)}</TourismBadge>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={[styles.resultDescription, { color: colors.textMuted }]}
      >
        {center.description ?? "Información turística verificada."}
      </Text>
      <View style={styles.resultAction}>
        <Text
          style={[styles.resultActionText, { color: colors.primaryStrong }]}
        >
          Ver ficha turística
        </Text>
        <TurismoIcon
          color={colors.primaryStrong}
          name="chevronDown"
          size={turismoIconSizes.sm}
          style={styles.resultActionIcon}
        />
      </View>
    </Pressable>
  );
}

function distanceMeters(
  center: PublicCenter,
  origin: UserLocationCoordinate,
): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(center.latitude - origin.latitude);
  const longitudeDelta = toRadians(center.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const centerLatitude = toRadians(center.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(centerLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function formatDistance(value: number): string {
  if (value < 1_000) return `${Math.round(value)} m`;
  return `${(value / 1_000).toFixed(1)} km`;
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
  filterChips: { gap: turismoSpacing.xs, paddingRight: turismoSpacing.md },
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
  statusTitle: { ...turismoTypography.heading, textAlign: "center" },
  statusText: { ...turismoTypography.caption, textAlign: "center" },
  resultsList: { gap: turismoSpacing.sm },
  resultCard: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  resultCategory: { ...turismoTypography.label, textTransform: "uppercase" },
  resultName: { ...turismoTypography.heading },
  resultMeta: { ...turismoTypography.body },
  resultTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
  },
  resultDescription: { ...turismoTypography.caption },
  resultAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    marginTop: turismoSpacing.xxs,
  },
  resultActionText: { ...turismoTypography.label },
  resultActionIcon: { transform: [{ rotate: "-90deg" }] },
});
