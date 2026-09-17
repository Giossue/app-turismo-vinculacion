import { useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TourismActionButton,
  TourismChoiceChip,
  TourismIconAction,
  TourismSearchField,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import type {
  CenterFilters,
  PublicCenter,
} from "@/features/centers/domain/public-center";
import { CenterMap } from "@/features/map/presentation/center-map";

export default function HomeScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCenterCode, setSelectedCenterCode] = useState<
    string | null | undefined
  >(undefined);
  const [filters, setFilters] = useState<Omit<CenterFilters, "text">>({});
  const deferredText = useDeferredValue(text.trim());
  const query = useMemo(
    () => ({ ...filters, text: deferredText || undefined }),
    [deferredText, filters],
  );
  const {
    data: centers = [],
    error,
    isPending,
    refetch,
  } = usePublishedCenters(query);
  const { data: catalog } = useDiscoveryCatalog();

  const openDetail = (center: PublicCenter) =>
    router.push({
      pathname: "/centers/[code]" as never,
      params: { code: center.code },
    });

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;

  const types = (catalog?.types ?? []).filter(
    (item) =>
      !filters.categoryCode || item.categoryCode === filters.categoryCode,
  );
  const cantons = (catalog?.cantons ?? []).filter(
    (item) =>
      !filters.provinceCode || item.provinceCode === filters.provinceCode,
  );
  const selectedCenter =
    selectedCenterCode === undefined
      ? (centers[0] ?? null)
      : (centers.find((center) => center.code === selectedCenterCode) ?? null);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <CenterMap
        centers={centers}
        onCenterPress={(center) => setSelectedCenterCode(center.code)}
        onViewportChange={(bounds) =>
          setFilters((current) => ({ ...current, bounds }))
        }
      />
      <SafeAreaView
        edges={["top", "bottom"]}
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View style={styles.topControls}>
          <View style={styles.searchBar}>
            <TourismSearchField
              accessibilityLabel="Buscar atractivos"
              onChangeText={setText}
              placeholder="Buscar aquí"
              value={text}
            />
            <TourismIconAction
              accessibilityLabel="Mostrar filtros"
              icon="filter-variant"
              onPress={() => setShowFilters((value) => !value)}
              selected={showFilters}
            />
          </View>
          <FilterChips
            label="Categorías de atractivos"
            options={catalog?.categories ?? []}
            selected={filters.categoryCode}
            onChange={(categoryCode) =>
              setFilters((current) => ({
                ...current,
                categoryCode,
                typeCode: undefined,
                subtypeCode: undefined,
              }))
            }
          />
          {showFilters ? (
            <TourismSurface style={styles.filtersPanel}>
              <View style={styles.filtersPanelHeader}>
                <Text style={styles.filtersPanelTitle}>Filtrar lugares</Text>
                <TourismIconAction
                  accessibilityLabel="Cerrar filtros"
                  icon="close"
                  onPress={() => setShowFilters(false)}
                />
              </View>
              <FilterChips
                label="Tipo"
                options={types}
                selected={filters.typeCode}
                onChange={(typeCode) =>
                  setFilters((current) => ({
                    ...current,
                    typeCode,
                    subtypeCode: undefined,
                  }))
                }
              />
              <FilterChips
                label="Provincia"
                options={catalog?.provinces ?? []}
                selected={filters.provinceCode}
                onChange={(provinceCode) =>
                  setFilters((current) => ({
                    ...current,
                    provinceCode,
                    cantonCode: undefined,
                    parishCode: undefined,
                  }))
                }
              />
              <FilterChips
                label="Cantón"
                options={cantons}
                selected={filters.cantonCode}
                onChange={(cantonCode) =>
                  setFilters((current) => ({
                    ...current,
                    cantonCode,
                    parishCode: undefined,
                  }))
                }
              />
              <FilterChips
                label="Jerarquía"
                options={catalog?.hierarchies ?? []}
                selected={filters.hierarchyCode}
                onChange={(hierarchyCode) =>
                  setFilters((current) => ({ ...current, hierarchyCode }))
                }
              />
            </TourismSurface>
          ) : null}
        </View>
        <View pointerEvents="box-none" style={styles.bottomArea}>
          <View pointerEvents="auto" style={styles.locationNotice}>
            <Text style={styles.locationNoticeText}>
              Explora sin activar tu ubicación
            </Text>
          </View>
          {selectedCenter ? (
            <PlaceSheet
              center={selectedCenter}
              onClose={() => setSelectedCenterCode(null)}
              onOpenDetail={() => openDetail(selectedCenter)}
            />
          ) : (
            <View pointerEvents="auto">
              <TourismSurface style={styles.exploreSheet}>
                <View style={styles.dragHandle} />
                <Text style={styles.exploreTitle}>Explora Guaranda</Text>
                <Text style={styles.exploreText}>
                  Toca un marcador para conocer un atractivo turístico.
                </Text>
              </TourismSurface>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function FilterChips({
  label,
  options,
  selected,
  onChange,
}: Readonly<{
  label: string;
  options: readonly { code: string; name: string }[];
  selected?: string;
  onChange: (value: string | undefined) => void;
}>) {
  if (!options.length) return null;
  return (
    <ScrollView
      accessibilityLabel={label}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroller}
      contentContainerStyle={styles.chips}
    >
      <FilterChip
        label="Todo"
        selected={!selected}
        onPress={() => onChange(undefined)}
      />
      {options.map((option) => (
        <FilterChip
          key={option.code}
          label={option.name}
          selected={selected === option.code}
          onPress={() => onChange(option.code)}
        />
      ))}
    </ScrollView>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <TourismChoiceChip label={label} onPress={onPress} selected={selected} />
  );
}

function PlaceSheet({
  center,
  onClose,
  onOpenDetail,
}: Readonly<{
  center: PublicCenter;
  onClose: () => void;
  onOpenDetail: () => void;
}>) {
  return (
    <View pointerEvents="auto">
      <TourismSurface style={styles.placeSheet}>
        <View style={styles.dragHandle} />
        <View style={styles.placeHeader}>
          <View style={styles.placeTitleBlock}>
            <Text style={styles.placeCategory}>{center.category}</Text>
            <Text numberOfLines={2} style={styles.placeTitle}>
              {center.name}
            </Text>
            <Text numberOfLines={2} style={styles.placeDescription}>
              {center.description ?? "Información turística verificada."}
            </Text>
          </View>
          <TourismIconAction
            accessibilityLabel="Cerrar ficha rápida"
            icon="close"
            onPress={onClose}
          />
        </View>
        <View style={styles.placeTags}>
          <Text style={styles.placeTag}>{center.subtype}</Text>
          {center.hierarchy ? (
            <Text style={styles.placeTag}>Jerarquía {center.hierarchy}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <TourismActionButton label="Ver ficha" onPress={onOpenDetail} />
          <TourismActionButton
            disabled
            label="Cómo llegar · Próximamente"
            mode="outlined"
            style={styles.routeAction}
          />
        </View>
      </TourismSurface>
    </View>
  );
}

function LoadingState() {
  return (
    <View accessibilityLabel="Cargando mapa turístico" style={styles.loading}>
      <ActivityIndicator color="#0ea5a6" size="large" />
      <Text style={styles.loadingText}>Preparando el mapa turístico…</Text>
    </View>
  );
}

function ErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <View style={styles.loading}>
      <Text style={styles.errorTitle}>
        No pudimos cargar el mapa turístico.
      </Text>
      <TourismActionButton label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0f172a", flex: 1 },
  overlay: {
    bottom: 0,
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topControls: { gap: 10, paddingHorizontal: 16 },
  searchBar: {
    alignItems: "center",
    flexDirection: "row",
  },
  chipScroller: { flexGrow: 0 },
  chips: { gap: 8, paddingRight: 16 },
  filtersPanel: {
    backgroundColor: "#182331",
    borderColor: "#475569",
    borderRadius: 18,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  filtersPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filtersPanelTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  bottomArea: { alignItems: "center", gap: 10, paddingHorizontal: 12 },
  locationNotice: {
    backgroundColor: "#182331e6",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  locationNoticeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  exploreSheet: {
    alignSelf: "stretch",
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderRadius: 25,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  dragHandle: {
    alignSelf: "center",
    backgroundColor: "#64748b",
    borderRadius: 999,
    height: 4,
    marginBottom: 7,
    width: 42,
  },
  exploreTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  exploreText: { color: "#cbd5e1", fontSize: 14, lineHeight: 20 },
  placeSheet: {
    alignSelf: "stretch",
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderRadius: 25,
    borderWidth: 1,
    gap: 13,
    padding: 18,
  },
  placeHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  placeTitleBlock: { flex: 1, gap: 5 },
  placeCategory: { color: "#5eead4", fontSize: 13, fontWeight: "800" },
  placeTitle: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 29,
  },
  placeDescription: { color: "#cbd5e1", fontSize: 14, lineHeight: 20 },
  placeTags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  placeTag: {
    backgroundColor: "#273449",
    borderRadius: 999,
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: { flexDirection: "row", gap: 9 },
  routeAction: { flex: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#cbd5e1", fontSize: 15 },
  errorTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
});
