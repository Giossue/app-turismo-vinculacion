import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { formatDistance } from "@/core/format/distance";
import type { GeoCoordinate } from "@/core/geo/types";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismBadge,
  TourismChoiceChip,
  TourismIconAction,
} from "@/core/ui/tourism-controls";
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
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import type { PublicCenter } from "../domain/public-center";
import { FilterChips } from "./discovery-filters";
import {
  buildSearchResultItems,
  type SearchResultItem,
} from "./search-result-items";

type CategoryOption = Readonly<{ code: string; name: string }>;

/**
 * Body of the map sheet with the submitted search: category chips, then a
 * virtualized list of published centers and other search places.
 */
export function SearchResultsSheet({
  categories,
  centers,
  error,
  isFetching,
  onCategoryChange,
  onClose,
  onRetry,
  onSelectCenter,
  onSelectPlace,
  onToggleSortByDistance,
  places,
  query,
  selectedCategory,
  sortByDistance,
  userLocation,
}: Readonly<{
  categories: readonly CategoryOption[];
  centers: readonly PublicCenter[];
  error: Error | null;
  isFetching: boolean;
  onCategoryChange: (categoryCode: string | undefined) => void;
  onClose: () => void;
  onRetry: () => void;
  onSelectCenter: (center: PublicCenter) => void;
  onSelectPlace: (place: PublicSearchResult) => void;
  onToggleSortByDistance: () => void;
  places: readonly PublicSearchResult[];
  query: string;
  selectedCategory?: string;
  sortByDistance: boolean;
  userLocation: GeoCoordinate | null;
}>) {
  const colors = useTurismoPalette();
  const { height, width } = useWindowDimensions();
  const items = buildSearchResultItems({
    centers,
    origin: userLocation,
    places,
    sortByDistance,
  });
  const showResults = !isFetching && !error;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.query, { color: colors.text }]}>{query}</Text>
        <TourismIconAction
          accessibilityLabel="Cerrar resultados"
          icon="close"
          onPress={onClose}
          variant="ghost"
        />
      </View>
      <FilterChips
        label="Categorías de búsqueda turística"
        onChange={onCategoryChange}
        options={categories}
        selected={selectedCategory}
        trailing={
          userLocation ? (
            <TourismChoiceChip
              label="Cerca de mí"
              onPress={onToggleSortByDistance}
              selected={sortByDistance}
            />
          ) : null
        }
      />
      {isFetching ? (
        <TourismStateView
          layout="inline"
          message="Buscando atractivos turísticos…"
          variant="loading"
        />
      ) : null}
      {error ? (
        <TourismStateView
          layout="card"
          message="Conservamos el mapa disponible. Inténtalo de nuevo."
          onAction={onRetry}
          title="No pudimos actualizar la búsqueda."
          variant="error"
        />
      ) : null}
      {showResults && items.length === 0 ? (
        <TourismStateView
          layout="card"
          message="Prueba con otro nombre, categoría o tipo de lugar."
          title={`No encontramos lugares con “${query}”.`}
          variant="empty"
        />
      ) : null}
    </View>
  );

  return (
    <BottomSheetFlatList
      ItemSeparatorComponent={ResultSeparator}
      ListHeaderComponent={header}
      contentContainerStyle={[
        styles.content,
        width > height && { maxWidth: turismoMetrics.sheetMaxWidth },
      ]}
      data={showResults ? items : []}
      keyExtractor={(item: SearchResultItem) => item.key}
      renderItem={({ item }: { item: SearchResultItem }) =>
        item.kind === "center" ? (
          <SearchResultCard
            center={item.center}
            distanceMeters={item.distanceMeters}
            onPress={() => onSelectCenter(item.center)}
          />
        ) : (
          <SearchPlaceCard
            onPress={() => onSelectPlace(item.place)}
            place={item.place}
          />
        )
      }
      showsVerticalScrollIndicator={false}
      style={styles.list}
    />
  );
}

function ResultSeparator() {
  return <View style={styles.separator} />;
}

const placeKindCopy = {
  center: {
    hint: "Centra el mapa y abre la ficha turística",
    label: "Centro turístico publicado",
  },
  establishment: {
    hint: "Centra el mapa y abre la ficha del establecimiento",
    label: "Catastro publicado",
  },
  geographic: {
    hint: "Centra el mapa en esta ubicación",
    label: "Ubicación en Ecuador",
  },
} as const;

function SearchPlaceCard({
  onPress,
  place,
}: Readonly<{
  onPress: () => void;
  place: PublicSearchResult;
}>) {
  const colors = useTurismoPalette();
  const copy = placeKindCopy[place.kind];
  const subtitle = place.subtitle || "Ecuador";
  return (
    <Pressable
      accessibilityHint={copy.hint}
      accessibilityLabel={`${place.title}, ${copy.label}, ${subtitle}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {place.kind !== "geographic" ? (
        <Text style={[styles.resultCategory, { color: colors.primaryStrong }]}>
          {copy.label}
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
        {subtitle}
      </Text>
    </Pressable>
  );
}

function SearchResultCard({
  center,
  distanceMeters,
  onPress,
}: Readonly<{
  center: PublicCenter;
  distanceMeters: number | null;
  onPress: () => void;
}>) {
  const colors = useTurismoPalette();
  const distance =
    distanceMeters !== null ? formatDistance(distanceMeters) : null;
  return (
    <Pressable
      accessibilityHint={placeKindCopy.center.hint}
      accessibilityLabel={[
        center.name,
        center.category,
        distance ? `a ${distance}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
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
        {distance ? <TourismBadge>{distance}</TourismBadge> : null}
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
          name="chevronRight"
          size={turismoIconSizes.sm}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    padding: turismoSpacing.lg,
    paddingBottom: turismoSpacing.xxl,
    width: "100%",
  },
  header: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.md },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  query: { ...turismoTypography.title, flex: 1 },
  separator: { height: turismoSpacing.sm },
  pressed: { opacity: turismoOpacity.pressed },
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
});
