import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismBadge,
  TourismChoiceChip,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { formatDistance } from "@/core/format/distance";
import { getDistanceMeters } from "@/core/geo/distance";
import type { GeoCoordinate } from "@/core/geo/types";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import type { DiscoveryCatalog, PublicCenter } from "../domain/public-center";
import { uniqueByCode } from "../domain/unique-by-code";
import type { DiscoveryFilterValues } from "./discovery-filters";

export function SearchResultsSheet({
  catalog,
  centers,
  error,
  filters,
  isFetching,
  isPlaceholderData,
  nearbyOnly,
  onChangeFilters,
  onNearbyToggle,
  onRetry,
  onSelectPlace,
  onSelectCenter,
  places,
  query,
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
  onNearbyToggle: () => void;
  onRetry: () => void;
  onSelectPlace: (place: PublicSearchResult) => void;
  onSelectCenter: (center: PublicCenter) => void;
  places: readonly PublicSearchResult[];
  query: string;
  userLocation: GeoCoordinate | null;
}>) {
  const colors = useTurismoPalette();
  const sortedCenters = useMemo(() => {
    if (!nearbyOnly || !userLocation) return centers;
    return [...centers].sort(
      (left, right) =>
        getDistanceMeters(left, userLocation) -
        getDistanceMeters(right, userLocation),
    );
  }, [centers, nearbyOnly, userLocation]);
  const showResults = !isFetching && !isPlaceholderData && !error;
  const supplementalPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          place.kind !== "center" ||
          !centers.some((center) => center.code === place.centerCode),
      ),
    [centers, places],
  );
  const hasAnyResults =
    sortedCenters.length > 0 || supplementalPlaces.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.query, { color: colors.text }]}>{query}</Text>
        </View>
      </View>

      <ScrollView
        accessibilityLabel="Categorías de búsqueda turística"
        contentContainerStyle={styles.filterChips}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <TourismChoiceChip
          label="Todo"
          onPress={() =>
            onChangeFilters({ ...filters, categoryCode: undefined })
          }
          selected={!filters.categoryCode}
        />
        {uniqueByCode(catalog?.categories ?? []).map((category) => (
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

      {showResults && !hasAnyResults ? (
        <TourismSurface style={styles.statusCard}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="search"
            size={turismoIconSizes.lg}
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            No encontramos lugares con “{query}”.
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Prueba con otro nombre, categoría o tipo de lugar.
          </Text>
        </TourismSurface>
      ) : null}

      {showResults ? (
        <View style={styles.resultsList}>
          {sortedCenters.map((center) => (
            <SearchResultCard
              center={center}
              distance={
                userLocation ? getDistanceMeters(center, userLocation) : null
              }
              key={center.code}
              onPress={() => onSelectCenter(center)}
            />
          ))}
          {supplementalPlaces.map((place) => (
            <SearchPlaceCard
              key={`${place.kind}-${place.title}-${place.latitude}-${place.longitude}`}
              onPress={() => onSelectPlace(place)}
              place={place}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SearchPlaceCard({
  onPress,
  place,
}: Readonly<{
  onPress: () => void;
  place: PublicSearchResult;
}>) {
  const colors = useTurismoPalette();
  const isGeographic = place.kind === "geographic";
  const label =
    place.kind === "establishment"
      ? "Catastro publicado"
      : place.kind === "geographic"
        ? "Ubicación en Ecuador"
        : "Centro turístico publicado";
  return (
    <Pressable
      accessibilityLabel={`Centrar mapa en ${place.title}`}
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
      {!isGeographic ? (
        <Text style={[styles.resultCategory, { color: colors.primaryStrong }]}>
          {label}
        </Text>
      ) : null}
      <Text
        numberOfLines={2}
        style={[styles.resultName, { color: colors.text }]}
      >
        {place.title}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.resultMeta, { color: colors.textMuted }]}
      >
        {place.subtitle || "Ecuador"}
      </Text>
    </Pressable>
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
