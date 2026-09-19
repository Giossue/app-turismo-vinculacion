import ExpoBottomSheet, {
  BottomSheetScrollView,
} from "@expo/ui/community/bottom-sheet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TourismActionButton,
  TourismBadge,
  TourismIconAction,
  TourismSearchField,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { useTourismMenu } from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import type {
  PublicCenter,
  PublicCenterDetail,
} from "@/features/centers/domain/public-center";
import {
  AdvancedDiscoveryFilters,
  FilterChips,
  type DiscoveryFilterValues,
} from "@/features/centers/presentation/discovery-filters";
import { SearchResultsSheet } from "@/features/centers/presentation/search-results-sheet";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import { CenterMap } from "@/features/map/presentation/center-map";
import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { closeMenu, menuVisible } = useTourismMenu();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const sheetRef = useRef<ExpoBottomSheet>(null);
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [selectedCenterCode, setSelectedCenterCode] = useState<string | null>(
    null,
  );
  const [focusLocationKey, setFocusLocationKey] = useState(0);
  const {
    coordinate: userLocation,
    requestLocation,
    status: locationStatus,
    message: locationMessage,
  } = useUserLocation();
  const [filters, setFilters] = useState<DiscoveryFilterValues>({});
  const submittedQuery = submittedText.trim();
  const query = useMemo(
    () => ({ ...filters, text: submittedQuery || undefined }),
    [filters, submittedQuery],
  );
  const {
    data: centers = [],
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  } = usePublishedCenters(query);
  const { data: catalog } = useDiscoveryCatalog();

  const selectedCenter = selectedCenterCode
    ? (centers.find((center) => center.code === selectedCenterCode) ?? null)
    : null;
  const isSearchMode =
    searchFocused || Boolean(text.trim()) || Boolean(submittedQuery);

  const clearSearch = useCallback(() => {
    setText("");
    setSubmittedText("");
    setSearchFocused(false);
    setShowFilters(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    sheetRef.current?.dismiss();
  }, []);
  const {
    data: selectedCenterDetail,
    error: selectedCenterDetailError,
    isPending: isSelectedCenterDetailPending,
    refetch: refetchSelectedCenterDetail,
  } = usePublishedCenter(selectedCenterCode ?? "");

  const handleBeforeBack = useCallback(() => {
    if (menuVisible) {
      closeMenu();
      return true;
    }
    if (showFilters) {
      setShowFilters(false);
      return true;
    }
    if (selectedCenterCode) {
      sheetRef.current?.dismiss();
      if (submittedQuery) clearSearch();
      else setSelectedCenterCode(null);
      return true;
    }
    if (submittedQuery || text.trim()) {
      clearSearch();
      return true;
    }
    return false;
  }, [
    clearSearch,
    closeMenu,
    menuVisible,
    selectedCenterCode,
    submittedQuery,
    showFilters,
    text,
  ]);

  useScreenBackHandler(handleBeforeBack);

  useEffect(() => {
    if (!submittedQuery) return;
    sheetRef.current?.present();
  }, [submittedQuery]);

  useEffect(() => {
    if (submittedQuery) return;
    if (!selectedCenter) {
      sheetRef.current?.dismiss();
      return;
    }
    sheetRef.current?.present();
  }, [selectedCenter, submittedQuery]);

  const handleViewportChange = useCallback(() => {
    // El catálogo ya cargado no se reemplaza durante pan/zoom. Así MapLibre
    // conserva los símbolos y el usuario no ve parpadeos ni pines que se
    // pierden mientras termina una consulta por viewport. La consulta acotada
    // se habilitará cuando exista paginación/cache de viewport en la API.
  }, []);

  const openRoute = () => {
    // La ficha es un overlay transitorio del mapa: debe desaparecer antes de
    // cambiar de pantalla para no quedar montada sobre la ruta.
    sheetRef.current?.dismiss();
    setSelectedCenterCode(null);
    router.push("/route" as never);
  };

  const handleLocateUser = useCallback(async () => {
    const coordinate = await requestLocation();
    if (coordinate) setFocusLocationKey((value) => value + 1);
  }, [requestLocation]);

  const handleSubmitSearch = useCallback(() => {
    const nextQuery = text.trim();
    if (nextQuery.length < 2) return;
    setSubmittedText(nextQuery);
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setShowFilters(false);
  }, [text]);

  const handleNearbyToggle = useCallback(() => {
    if (!userLocation) return;
    setNearbyOnly((value) => !value);
  }, [userLocation]);

  const locationButtonLabel =
    locationStatus === "ready"
      ? "Centrar mapa en mi ubicación"
      : "Usar mi ubicación";
  const locationNoticeText =
    locationMessage ??
    (locationStatus === "requesting"
      ? "Buscando tu ubicación…"
      : "Activa el GPS para encontrar tu posición.");
  const retryCenters = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (error && centers.length === 0) {
    return <ErrorState onRetry={retryCenters} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.mapBackground }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CenterMap
        basemapMode="streets"
        centers={centers}
        onCenterPress={(center) => setSelectedCenterCode(center.code)}
        onViewportChange={handleViewportChange}
        selectedCenterCode={selectedCenterCode}
        focusLocationKey={focusLocationKey}
        userLocation={userLocation}
      />
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View
          style={[
            styles.topControls,
            isLandscape && styles.topControlsLandscape,
          ]}
        >
          <View style={styles.searchRow}>
            <TourismSearchField
              accessibilityLabel="Buscar atractivos"
              onBlur={() => setSearchFocused(false)}
              onChangeText={setText}
              onClear={clearSearch}
              onFocus={() => setSearchFocused(true)}
              onSubmitEditing={handleSubmitSearch}
              placeholder="Buscar aquí"
              value={text}
            />
          </View>
          {!isSearchMode ? (
            <>
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
                onFilterAction={() => setShowFilters((value) => !value)}
                filterActionSelected={showFilters}
                showFilterAction
              />
              {showFilters ? (
                <AdvancedDiscoveryFilters
                  catalog={catalog}
                  filters={filters}
                  onChange={setFilters}
                  onClose={() => setShowFilters(false)}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </SafeAreaView>
      <View
        pointerEvents="box-none"
        style={[
          styles.mapActionLayer,
          isLandscape && styles.mapActionLayerLandscape,
        ]}
      >
        {locationStatus !== "ready" ? (
          <View
            pointerEvents="auto"
            style={[
              styles.locationNotice,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {locationStatus === "requesting" ? (
              <ActivityIndicator
                color={colors.primaryStrong}
                size="small"
              />
            ) : (
              <TurismoIcon
                color={colors.primaryStrong}
                name="locate"
                size={turismoIconSizes.sm}
              />
            )}
            <Text
              numberOfLines={1}
              style={[styles.locationNoticeText, { color: colors.textMuted }]}
            >
              {locationNoticeText}
            </Text>
          </View>
        ) : null}
        <TourismIconAction
          accessibilityLabel={locationButtonLabel}
          disabled={locationStatus === "requesting"}
          icon="locate"
          onPress={() => void handleLocateUser()}
          selected={locationStatus === "ready"}
          style={styles.locationAction}
        />
      </View>
      <ExpoBottomSheet
        backgroundStyle={{ backgroundColor: colors.surface }}
        enablePanDownToClose
        index={-1}
        onClose={() => {
          if (selectedCenterCode) setSelectedCenterCode(null);
          else clearSearch();
        }}
        ref={sheetRef}
        snapPoints={["38%", "84%"]}
      >
        {selectedCenter ? (
          <BottomSheetScrollView
            key={selectedCenter.code}
            contentContainerStyle={[
              styles.sheetView,
              isLandscape && styles.sheetViewLandscape,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <PlaceSheet
              center={selectedCenter}
              detail={selectedCenterDetail}
              detailError={selectedCenterDetailError}
              detailPending={isSelectedCenterDetailPending}
              onClose={() => {
                if (submittedQuery) setSelectedCenterCode(null);
                else clearSearch();
              }}
              onOpenRoute={openRoute}
              onRetryDetail={() => void refetchSelectedCenterDetail()}
            />
          </BottomSheetScrollView>
        ) : submittedQuery ? (
          <BottomSheetScrollView
            contentContainerStyle={[
              styles.sheetView,
              isLandscape && styles.sheetViewLandscape,
            ]}
            key={`search-${submittedQuery}`}
            showsVerticalScrollIndicator={false}
          >
            <SearchResultsSheet
              catalog={catalog}
              centers={centers}
              error={error ?? null}
              filters={filters}
              isFetching={isFetching}
              isPlaceholderData={isPlaceholderData}
              nearbyOnly={nearbyOnly}
              onChangeFilters={setFilters}
              onClear={clearSearch}
              onNearbyToggle={handleNearbyToggle}
              onRetry={() => void refetch()}
              onSelectCenter={(center) => setSelectedCenterCode(center.code)}
              onToggleFilters={() => setShowFilters((value) => !value)}
              query={submittedQuery}
              showFilters={showFilters}
              userLocation={userLocation}
            />
          </BottomSheetScrollView>
        ) : null}
      </ExpoBottomSheet>
    </View>
  );
}

function PlaceSheet({
  center,
  detail,
  detailError,
  detailPending,
  onClose,
  onOpenRoute,
  onRetryDetail,
}: Readonly<{
  center: PublicCenter;
  detail?: PublicCenterDetail;
  detailError: Error | null;
  detailPending: boolean;
  onClose: () => void;
  onOpenRoute: () => void;
  onRetryDetail: () => void;
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
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
          style={styles.routeAction}
        />
      </View>
      {detailPending ? (
        <View style={styles.detailState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.detailStateText, { color: colors.textMuted }]}>
            Cargando la ficha completa…
          </Text>
        </View>
      ) : detailError || !detail ? (
        <View style={styles.detailState}>
          <TurismoIcon
            color={colors.danger}
            name="wifiOff"
            size={turismoIconSizes.md}
          />
          <Text style={[styles.detailStateText, { color: colors.textMuted }]}>
            No pudimos cargar todos los datos de la ficha.
          </Text>
          <TourismActionButton
            icon="refresh"
            label="Reintentar"
            mode="outlined"
            onPress={onRetryDetail}
          />
        </View>
      ) : (
        <PlaceDetail detail={detail} />
      )}
    </View>
  );
}

function PlaceDetail({ detail }: Readonly<{ detail: PublicCenterDetail }>) {
  const colors = useTurismoPalette();
  return (
    <>
      <PlacePhotoGallery photos={detail.photos} />
      {detail.description ? (
        <PlaceSection icon="circleHelp" title="Descripción">
          <Text style={[styles.detailInfoValue, { color: colors.text }]}>
            {detail.description}
          </Text>
        </PlaceSection>
      ) : null}
      <PlaceSection icon="mapPinned" title="Información del lugar">
        <PlaceInfoRow label="Zona turística" value={detail.touristZone} />
        <PlaceInfoRow label="Categoría" value={detail.category} />
        <PlaceInfoRow label="Tipo" value={detail.type} />
        <PlaceInfoRow label="Subtipo" value={detail.subtype} />
        {detail.address ? (
          <PlaceInfoRow label="Dirección" value={detail.address} />
        ) : null}
        {detail.altitudeMeters !== null ? (
          <PlaceInfoRow
            label="Altitud"
            value={`${detail.altitudeMeters} msnm`}
          />
        ) : null}
        <PlaceInfoRow label="Código turístico" value={detail.code} />
      </PlaceSection>
      <PlaceSection icon="calendar" title="Ingreso y horario">
        {detail.admission ? (
          <>
            <PlaceInfoRow
              label="Acceso"
              value={`${detail.admission.type} · ${detail.admission.attention}`}
            />
            {detail.admission.opensAt || detail.admission.closesAt ? (
              <PlaceInfoRow
                label="Horario"
                value={`${detail.admission.opensAt ?? "--:--"} – ${detail.admission.closesAt ?? "--:--"}`}
              />
            ) : null}
            {detail.admission.priceFrom !== null ||
              detail.admission.priceTo !== null ? (
              <PlaceInfoRow
                label="Precio"
                value={formatPrice(
                  detail.admission.priceFrom,
                  detail.admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <PlaceEmptyState text="No hay información de ingreso registrada." />
        )}
      </PlaceSection>
      <PlaceTagsSection
        icon="compass"
        title="Actividades"
        values={detail.activities}
      />
      <PlaceTagsSection
        icon="locate"
        title="Accesibilidad"
        values={detail.accessibility}
      />
      <PlaceTagsSection
        icon="map"
        title="Facilidades"
        values={detail.facilities}
      />
    </>
  );
}

function PlacePhotoGallery({
  photos,
}: Readonly<{ photos: PublicCenterDetail["photos"] }>) {
  const colors = useTurismoPalette();
  if (!photos.length) return null;
  return (
    <PlaceSection icon="mapPinned" title="Galería">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.detailGallery}
      >
        {photos.map((photo) => (
          <Image
            key={photo.id}
            accessibilityLabel={photo.description ?? "Fotografía del atractivo"}
            source={{ uri: resolveMediaUrl(photo.url) }}
            style={styles.detailGalleryImage}
          />
        ))}
      </ScrollView>
      <Text
        style={[styles.detailInfoValue, { color: colors.textMuted }]}
      >
        Imágenes publicadas en esta ficha.
      </Text>
    </PlaceSection>
  );
}

function resolveMediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const api = (
    process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000/api/v1"
  ).replace(/\/$/, "");
  return `${api.replace(/\/api\/v1$/, "")}${path}`;
}

function PlaceSection({
  children,
  icon,
  title,
}: Readonly<{
  children: ReactNode;
  icon: "calendar" | "circleHelp" | "mapPinned";
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.detailSection,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <View style={styles.detailSectionHeader}>
        <TurismoIcon
          color={colors.primaryStrong}
          name={icon}
          size={turismoIconSizes.md}
        />
        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.detailSectionContent}>{children}</View>
    </View>
  );
}

function PlaceTagsSection({
  icon,
  title,
  values,
}: Readonly<{
  icon: "compass" | "locate" | "map";
  title: string;
  values: readonly string[];
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      style={[
        styles.detailSection,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <View style={styles.detailSectionHeader}>
        <TurismoIcon
          color={colors.primaryStrong}
          name={icon}
          size={turismoIconSizes.md}
        />
        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {values.length ? (
        <View style={styles.detailTags}>
          {values.map((value) => (
            <TourismBadge key={value}>{value}</TourismBadge>
          ))}
        </View>
      ) : (
        <PlaceEmptyState text={`No hay ${title.toLowerCase()} registradas.`} />
      )}
    </View>
  );
}

function PlaceInfoRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.detailInfoRow}>
      <Text style={[styles.detailInfoLabel, { color: colors.textFaint }]}>
        {label}
      </Text>
      <Text style={[styles.detailInfoValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

function PlaceEmptyState({ text }: Readonly<{ text: string }>) {
  const colors = useTurismoPalette();
  return (
    <Text style={[styles.detailEmptyText, { color: colors.textMuted }]}>
      {text}
    </Text>
  );
}

function formatPrice(from: number | null, to: number | null): string {
  if (from !== null && to !== null && from !== to)
    return `$${from.toFixed(2)} – $${to.toFixed(2)}`;
  const value = from ?? to;
  return value === null ? "No especificado" : `$${value.toFixed(2)}`;
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
  topControlsLandscape: {
    alignSelf: "center",
    maxWidth: turismoMetrics.contentMaxWidth,
    width: "100%",
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  mapActionLayer: {
    alignItems: "center",
    bottom: turismoSpacing.md,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "flex-end",
    left: 0,
    paddingHorizontal: turismoSpacing.md,
    position: "absolute",
    right: 0,
  },
  mapActionLayerLandscape: {
    bottom: turismoSpacing.sm,
  },
  locationAction: {
    height: turismoMetrics.controlLg,
    width: turismoMetrics.controlLg,
  },
  locationNotice: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    flexShrink: 1,
    gap: turismoSpacing.xs,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.xs,
  },
  locationNoticeText: { ...turismoTypography.caption, flexShrink: 1 },
  sheetView: {
    alignSelf: "center",
    padding: turismoSpacing.lg,
    width: "100%",
  },
  sheetViewLandscape: { maxWidth: turismoMetrics.sheetMaxWidth },
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
  routeAction: { flex: 1 },
  detailState: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    paddingVertical: turismoSpacing.lg,
  },
  detailStateText: { ...turismoTypography.body, textAlign: "center" },
  detailSection: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  detailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  detailSectionTitle: { ...turismoTypography.heading },
  detailSectionContent: { gap: turismoSpacing.sm },
  detailGallery: { gap: turismoSpacing.sm },
  detailGalleryImage: {
    backgroundColor: "#d8e4e6",
    borderRadius: turismoRadii.md,
    height: 150,
    width: 220,
  },
  detailInfoRow: { gap: turismoSpacing.xxs },
  detailInfoLabel: { ...turismoTypography.caption },
  detailInfoValue: { ...turismoTypography.body },
  detailTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
  },
  detailEmptyText: { ...turismoTypography.body },
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
