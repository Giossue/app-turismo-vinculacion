import ExpoBottomSheet, {
  BottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  TourismBadge,
  TourismChoiceChip,
  TourismIconAction,
  TourismSearchField,
  TourismSectionTitle,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  TourismProfileButton,
  TourismProfilePopover,
  TourismTabBar,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import type {
  CenterFilters,
  PublicCenter,
} from "@/features/centers/domain/public-center";
import { CenterMap } from "@/features/map/presentation/center-map";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const sheetRef = useRef<ExpoBottomSheet>(null);
  const [text, setText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [selectedCenterCode, setSelectedCenterCode] = useState<string | null>(
    null,
  );
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

  const selectedCenter = selectedCenterCode
    ? (centers.find((center) => center.code === selectedCenterCode) ?? null)
    : null;

  useEffect(() => {
    if (selectedCenter) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [selectedCenter]);

  const openDetail = (center: PublicCenter) =>
    router.push({
      pathname: "/centers/[code]" as never,
      params: { code: center.code },
    });

  const navigateTab = (tab: "explore" | "agent" | "itinerary") => {
    if (tab === "explore") return;
    router.push(`/${tab}` as never);
  };

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.mapBackground }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CenterMap
        centers={centers}
        onCenterPress={(center) => setSelectedCenterCode(center.code)}
        onViewportChange={(bounds) =>
          setFilters((current) => ({ ...current, bounds }))
        }
      />
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View style={styles.topControls}>
          <View style={styles.searchRow}>
            <TourismSearchField
              accessibilityLabel="Buscar atractivos"
              onChangeText={setText}
              onClear={() => setText("")}
              placeholder="Buscar aquí"
              value={text}
            />
            <TourismIconAction
              accessibilityLabel="Mostrar filtros"
              icon="sliders"
              onPress={() => setShowFilters((value) => !value)}
              selected={showFilters}
            />
            <TourismProfileButton onPress={() => setProfileVisible(true)} />
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
                <TourismSectionTitle>Filtrar lugares</TourismSectionTitle>
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
      </SafeAreaView>
      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <View
          pointerEvents="auto"
          style={[styles.locationNotice, { backgroundColor: colors.surface }]}
        >
          <TurismoIcon
            color={colors.primaryStrong}
            name="locate"
            size={turismoIconSizes.sm}
          />
          <Text
            style={[styles.locationNoticeText, { color: colors.textMuted }]}
          >
            Explora sin activar tu ubicación
          </Text>
        </View>
        <SafeAreaView edges={["bottom"]} pointerEvents="auto">
          <TourismTabBar active="explore" onChange={navigateTab} />
        </SafeAreaView>
      </View>
      <ExpoBottomSheet
        backgroundStyle={{ backgroundColor: colors.surface }}
        enablePanDownToClose
        index={-1}
        onClose={() => setSelectedCenterCode(null)}
        ref={sheetRef}
        snapPoints={["38%", "84%"]}
      >
        {selectedCenter ? (
          <BottomSheetView style={styles.sheetView}>
            <PlaceSheet
              center={selectedCenter}
              onClose={() => setSelectedCenterCode(null)}
              onOpenDetail={() => openDetail(selectedCenter)}
              onOpenRoute={() => router.push("/route" as never)}
            />
          </BottomSheetView>
        ) : null}
      </ExpoBottomSheet>
      <TourismProfilePopover
        onClose={() => setProfileVisible(false)}
        onItinerary={() => {
          setProfileVisible(false);
          router.push("/itinerary" as never);
        }}
        onSaved={() => setProfileVisible(false)}
        visible={profileVisible}
      />
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
      contentContainerStyle={styles.chips}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <TourismChoiceChip
        label="Todo"
        onPress={() => onChange(undefined)}
        selected={!selected}
      />
      {options.map((option) => (
        <TourismChoiceChip
          key={option.code}
          label={option.name}
          onPress={() => onChange(option.code)}
          selected={selected === option.code}
        />
      ))}
    </ScrollView>
  );
}

function PlaceSheet({
  center,
  onClose,
  onOpenDetail,
  onOpenRoute,
}: Readonly<{
  center: PublicCenter;
  onClose: () => void;
  onOpenDetail: () => void;
  onOpenRoute: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.placeSheet}>
      <View style={styles.placeHeader}>
        <View style={styles.placeTitleBlock}>
          <Text style={[styles.placeCategory, { color: colors.primaryStrong }]}>
            {center.category}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.placeTitle, { color: colors.text }]}
          >
            {center.name}
          </Text>
          <Text
            numberOfLines={3}
            style={[styles.placeDescription, { color: colors.textMuted }]}
          >
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
        <TourismBadge>{center.subtype}</TourismBadge>
        {center.hierarchy ? (
          <TourismBadge>Jerarquía {center.hierarchy}</TourismBadge>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TourismActionButton
          icon="mapPinned"
          label="Ver ficha"
          onPress={onOpenDetail}
          style={styles.flexAction}
        />
        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          mode="outlined"
          onPress={onOpenRoute}
          style={styles.flexAction}
        />
      </View>
    </View>
  );
}

function LoadingState() {
  const colors = useTurismoPalette();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.loadingText, { color: colors.textMuted }]}>
        Preparando el mapa turístico…
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <TurismoIcon color={colors.danger} name="wifiOff" size={32} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        No pudimos cargar el mapa turístico.
      </Text>
      <TourismActionButton
        icon="refresh"
        label="Reintentar"
        onPress={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topControls: { gap: turismoSpacing.sm, paddingHorizontal: turismoSpacing.md },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  chips: { gap: turismoSpacing.xs, paddingRight: turismoSpacing.md },
  filtersPanel: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  filtersPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomOverlay: {
    alignItems: "center",
    bottom: 0,
    gap: turismoSpacing.sm,
    left: 0,
    paddingHorizontal: turismoSpacing.md,
    position: "absolute",
    right: 0,
  },
  locationNotice: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderColor: "#FFFFFF22",
    borderWidth: 1,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  locationNoticeText: { ...turismoTypography.caption },
  sheetView: { padding: turismoSpacing.lg },
  placeSheet: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xl },
  placeHeader: {
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  placeTitleBlock: { flex: 1, gap: turismoSpacing.xs },
  placeCategory: { ...turismoTypography.label, textTransform: "uppercase" },
  placeTitle: { ...turismoTypography.title },
  placeDescription: { ...turismoTypography.body },
  placeTags: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.xs },
  actions: { flexDirection: "row", gap: turismoSpacing.xs },
  flexAction: { flex: 1, paddingHorizontal: turismoSpacing.sm },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  loadingText: { ...turismoTypography.body, textAlign: "center" },
  errorTitle: { ...turismoTypography.heading, textAlign: "center" },
});
