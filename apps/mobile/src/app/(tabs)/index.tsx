import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
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
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Defs, LinearGradient, Rect, Stop, Svg } from "react-native-svg";
import { Redirect, Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TourismActionButton,
  TourismCompassAction,
  TourismChoiceChip,
  TourismIconAction,
  TourismSearchField,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  tourismAgentSheetBehavior,
  tourismAgentSheetSnapPoints,
  tourismFlexibleSheetBehavior,
  tourismFlexibleSheetSnapPoints,
} from "@/core/ui/tourism-bottom-sheet";
import {
  TourismMenuButton as NavigationMenuButton,
  useTourismMenu,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import {
  discoveryCatalogQueryKey,
  useDiscoveryCatalog,
} from "@/features/centers/application/use-discovery-catalog";
import {
  publishedCentersQueryKey,
  usePublishedCenters,
} from "@/features/centers/application/use-published-centers";
import {
  mapEstablishmentsQueryKey,
  useMapEstablishments,
} from "@/features/establishments/application/use-map-establishments";
import { useNearbyEstablishments } from "@/features/establishments/application/use-nearby-establishments";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import { EstablishmentDetailSheet } from "@/features/establishments/presentation/establishment-detail-sheet";
import { EstablishmentResultsSheet } from "@/features/establishments/presentation/establishment-results-sheet";
import type {
  PublicCenter,
  PublicCenterDetail,
} from "@/features/centers/domain/public-center";
import {
  FilterChips,
  type DiscoveryFilterValues,
} from "@/features/centers/presentation/discovery-filters";
import { SearchResultsSheet } from "@/features/centers/presentation/search-results-sheet";
import {
  clearSearchHistory,
  listSearchHistory,
  rememberSearch,
} from "@/features/centers/data/search-history-storage";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import { CenterMap } from "@/features/map/presentation/center-map";
import { MapAttributionButton } from "@/features/map/presentation/map-attribution-button";
import { MapFeatureSelectionSheet } from "@/features/map/presentation/map-feature-selection-sheet";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import { AgentChatContent } from "@/features/agent/presentation/agent-chat-content";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  readAuthEntryChoice,
  type AuthEntryChoice,
} from "@/features/auth/data/auth-entry-storage";
import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

type ExploreSearchMode = "CENTERS" | "ESTABLISHMENTS";
type PlaceTab = "information" | "opinions" | "photos";
type OpinionRatingSummary = Readonly<{
  averageRating: number | null;
  total: number;
}>;
const placeTabOrder = ["information", "opinions", "photos"] as const;

export default function HomeScreen() {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [entryChoice, setEntryChoice] = useState<
    AuthEntryChoice | null | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    void readAuthEntryChoice().then((choice) => {
      if (active) setEntryChoice(choice);
    });
    return () => {
      active = false;
    };
  }, []);

  if (
    entryChoice === undefined ||
    (auth.status === "loading" && entryChoice !== "guest")
  ) {
    return (
      <View
        style={[styles.entryLoading, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.entryLoadingText, { color: colors.textMuted }]}>
          Preparando Turismo Vinculación…
        </Text>
      </View>
    );
  }

  if (auth.status !== "authenticated" && entryChoice !== "guest") {
    return <Redirect href="/login" />;
  }

  return <ExploreMapScreen />;
}

function ExploreMapScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const { closeMenu, menuVisible, openMenu } = useTourismMenu();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const sheetRef = useRef<BottomSheetModal>(null);
  const agentSheetRef = useRef<BottomSheetModal>(null);
  const searchSheetOpenRef = useRef(false);
  const preserveSelectionOnSearchCloseRef = useRef(false);
  const agentSheetOpenRef = useRef(false);
  const mapAttributionHandlerRef = useRef<(() => void) | null>(null);
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [searchMode, setSearchMode] = useState<ExploreSearchMode>("CENTERS");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<readonly string[]>([]);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [resetNorthKey, setResetNorthKey] = useState(0);
  const [selectedCenterCode, setSelectedCenterCode] = useState<string | null>(
    null,
  );
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<PublicMapEstablishment | null>(null);
  const [mapFeatureSelection, setMapFeatureSelection] = useState<
    readonly MapFeatureSelection[] | null
  >(null);
  const [mapFeatureFocusSelection, setMapFeatureFocusSelection] =
    useState<MapFeatureSelection | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [focusLocationKey, setFocusLocationKey] = useState(0);
  const [confirmedLocationFocusKey, setConfirmedLocationFocusKey] = useState<
    number | null
  >(null);
  const locationFocusInitializedRef = useRef(false);
  const {
    coordinate: userLocation,
    requestLocation,
    status: locationStatus,
  } = useUserLocation();

  useEffect(() => {
    if (locationStatus !== "idle") return;

    locationFocusInitializedRef.current = false;
    void requestLocation();
  }, [locationStatus, requestLocation]);

  useEffect(() => {
    if (locationStatus !== "ready") {
      locationFocusInitializedRef.current = false;
      return;
    }
    if (!userLocation || locationFocusInitializedRef.current) return;

    locationFocusInitializedRef.current = true;
    setFocusLocationKey((value) => value + 1);
  }, [locationStatus, userLocation]);

  useEffect(() => {
    let active = true;
    void listSearchHistory().then((history) => {
      if (active) setSearchHistory(history);
    });
    return () => {
      active = false;
    };
  }, []);

  const [filters, setFilters] = useState<DiscoveryFilterValues>({});
  const handleAttributionChange = useCallback(
    (handler: (() => void) | null) => {
      mapAttributionHandlerRef.current = handler;
    },
    [],
  );
  const submittedQuery = submittedText.trim();
  const establishmentSearchQuery = useMemo(
    () =>
      searchMode === "ESTABLISHMENTS" && submittedQuery && userLocation
        ? {
            activity: submittedQuery,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }
        : null,
    [searchMode, submittedQuery, userLocation],
  );
  const nearbyEstablishments = useNearbyEstablishments(
    establishmentSearchQuery,
  );
  const mapEstablishments = useMapEstablishments();
  const query = useMemo(
    () => ({
      ...filters,
      text: searchMode === "CENTERS" ? submittedQuery || undefined : undefined,
    }),
    [filters, searchMode, submittedQuery],
  );
  const {
    data: centers = [],
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  } = usePublishedCenters(query);
  const { data: catalog } = useDiscoveryCatalog();
  const handleCategoryChange = useCallback(
    (categoryCode: string | undefined) => {
      setFilters((current) => ({
        ...current,
        categoryCode,
        typeCode: undefined,
        subtypeCode: undefined,
      }));
      if (categoryCode !== undefined) return;

      // "Todo" también funciona como actualización manual: invalida incluso
      // respuestas que todavía están dentro de su staleTime y conserva en el
      // mapa los datos actuales mientras llegan los nuevos.
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: publishedCentersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: mapEstablishmentsQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: discoveryCatalogQueryKey }),
      ]);
    },
    [queryClient],
  );
  // Conservamos los centros ya confirmados mientras se revalida la consulta;
  // una respuesta remota vacía sí los reemplaza al terminar correctamente.
  const visibleCenters =
    searchMode === "CENTERS" && error && centers.length === 0 ? [] : centers;

  const selectedCenter = selectedCenterCode
    ? (visibleCenters.find((center) => center.code === selectedCenterCode) ??
      null)
    : null;
  const isSearchMode =
    searchFocused ||
    Boolean(text.trim()) ||
    Boolean(submittedQuery) ||
    searchMode === "ESTABLISHMENTS";

  const presentSearchSheet = useCallback(() => {
    searchSheetOpenRef.current = true;
    sheetRef.current?.present();
  }, []);

  const dismissSearchSheet = useCallback(() => {
    if (!searchSheetOpenRef.current) return;
    searchSheetOpenRef.current = false;
    sheetRef.current?.dismiss();
  }, []);

  const closeAgent = useCallback(() => {
    setAgentOpen(false);
    if (!agentSheetOpenRef.current) return;
    agentSheetOpenRef.current = false;
    agentSheetRef.current?.dismiss();
  }, []);

  const clearSearch = useCallback(() => {
    setText("");
    setSubmittedText("");
    setSearchMode("CENTERS");
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
    setMapFeatureSelection(null);
    setMapFeatureFocusSelection(null);
    dismissSearchSheet();
  }, [dismissSearchSheet]);
  const closeSelectedCenter = useCallback(() => {
    if (submittedQuery) {
      setSelectedCenterCode(null);
      dismissSearchSheet();
      return;
    }
    clearSearch();
  }, [clearSearch, dismissSearchSheet, submittedQuery]);
  const closeSelectedEstablishment = useCallback(() => {
    setSelectedEstablishment(null);
  }, []);
  const selectCenter = useCallback(
    (center: PublicCenter) => {
      setMapFeatureFocusSelection(null);
      preserveSelectionOnSearchCloseRef.current = searchSheetOpenRef.current;
      dismissSearchSheet();
      setSelectedEstablishment(null);
      setSelectedCenterCode(center.code);
    },
    [dismissSearchSheet],
  );
  const selectEstablishment = useCallback(
    (establishment: PublicMapEstablishment) => {
      setMapFeatureFocusSelection(null);
      preserveSelectionOnSearchCloseRef.current = searchSheetOpenRef.current;
      dismissSearchSheet();
      setSelectedCenterCode(null);
      setSelectedEstablishment(establishment);
    },
    [dismissSearchSheet],
  );
  const handleMapFeatureSelection = useCallback(
    (selection: MapFeatureSelection) => {
      setMapFeatureSelection(null);
      setMapFeatureFocusSelection(selection);
    },
    [],
  );
  const handleOverlappingMapFeatures = useCallback(
    (selections: readonly MapFeatureSelection[]) => {
      if (selections.length === 0) return;
      if (selections.length === 1) {
        handleMapFeatureSelection(selections[0]);
        return;
      }

      preserveSelectionOnSearchCloseRef.current = searchSheetOpenRef.current;
      dismissSearchSheet();
      setSelectedCenterCode(null);
      setSelectedEstablishment(null);
      setMapFeatureFocusSelection(null);
      setMapFeatureSelection(selections);
    },
    [dismissSearchSheet, handleMapFeatureSelection],
  );
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
    if (agentOpen) {
      closeAgent();
      return true;
    }
    if (mapFeatureSelection) {
      setMapFeatureSelection(null);
      return true;
    }
    if (mapFeatureFocusSelection) {
      setMapFeatureFocusSelection(null);
      return true;
    }
    if (selectedEstablishment) {
      closeSelectedEstablishment();
      return true;
    }
    if (selectedCenterCode) {
      closeSelectedCenter();
      return true;
    }
    if (searchMode === "ESTABLISHMENTS") {
      clearSearch();
      return true;
    }
    if (submittedQuery || text.trim()) {
      clearSearch();
      return true;
    }
    return false;
  }, [
    clearSearch,
    closeSelectedCenter,
    closeSelectedEstablishment,
    closeAgent,
    closeMenu,
    menuVisible,
    agentOpen,
    mapFeatureSelection,
    mapFeatureFocusSelection,
    selectedCenterCode,
    selectedEstablishment,
    searchMode,
    submittedQuery,
    text,
  ]);

  useScreenBackHandler(handleBeforeBack);

  useEffect(() => {
    if (agentOpen) {
      agentSheetOpenRef.current = true;
      agentSheetRef.current?.present();
      return;
    }
  }, [agentOpen]);

  useEffect(() => {
    if (agentOpen || !submittedQuery) return;
    presentSearchSheet();
  }, [agentOpen, presentSearchSheet, submittedQuery]);

  const handleViewportChange = useCallback(() => {
    setConfirmedLocationFocusKey(null);
    // El catálogo ya cargado no se reemplaza durante pan/zoom. Así MapLibre
    // conserva los símbolos y el usuario no ve parpadeos ni pines que se
    // pierden mientras termina una consulta por viewport. La consulta acotada
    // se habilitará cuando exista paginación/cache de viewport en la API.
  }, []);

  const openRoute = () => {
    if (!selectedCenter) return;

    // La ficha es un overlay transitorio del mapa: debe desaparecer antes de
    // cambiar de pantalla para no quedar montada sobre la ruta.
    dismissSearchSheet();
    setSelectedCenterCode(null);
    router.push({
      pathname: "/route",
      params: {
        destinationLatitude: String(selectedCenter.latitude),
        destinationLongitude: String(selectedCenter.longitude),
        destinationName: selectedCenter.name,
      },
    } as never);
  };

  const handleLocateUser = useCallback(async () => {
    setConfirmedLocationFocusKey(null);
    const coordinate = await requestLocation();
    if (!coordinate) return;
    setFocusLocationKey((value) => value + 1);
  }, [requestLocation]);

  const handleLocationFocusChange = useCallback(
    (focused: boolean) => {
      setConfirmedLocationFocusKey(focused ? focusLocationKey : null);
    },
    [focusLocationKey],
  );

  const openAgent = useCallback(() => {
    if (auth.status !== "authenticated") {
      router.push({
        pathname: "/login",
        params: { returnTo: "/" },
      } as never);
      return;
    }
    dismissSearchSheet();
    setAgentOpen(true);
    setText("");
    setSubmittedText("");
    setSearchMode("CENTERS");
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
    setMapFeatureSelection(null);
    setMapFeatureFocusSelection(null);
  }, [auth.status, dismissSearchSheet, router]);

  const openAuth = useCallback(() => {
    router.push({
      pathname: "/login",
      params: { returnTo: "/" },
    } as never);
  }, [router]);

  const openAgentCenter = useCallback(
    (code: string) => {
      closeAgent();
      router.push({
        pathname: "/centers/[code]",
        params: { code },
      });
    },
    [closeAgent, router],
  );
  const openAgentRoute = useCallback(
    (destination: AgentRouteDestination, mode: "car" | "bicycle" | "foot") => {
      closeAgent();
      router.push({
        pathname: "/route",
        params: {
          destinationLatitude: String(destination.latitude),
          destinationLongitude: String(destination.longitude),
          destinationName: destination.name,
          mode,
        },
      } as never);
    },
    [closeAgent, router],
  );

  const handleSubmitSearch = useCallback(() => {
    const nextQuery = text.trim();
    if (nextQuery.length < 2) return;
    void rememberSearch(nextQuery).then(() => {
      setSearchHistory((current) =>
        [
          nextQuery,
          ...current.filter(
            (item) =>
              item.toLocaleLowerCase() !== nextQuery.toLocaleLowerCase(),
          ),
        ].slice(0, 8),
      );
    });
    setSubmittedText(nextQuery);
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
  }, [text]);

  const handleClearSearchInput = useCallback(() => {
    setText("");
    setSubmittedText("");
    dismissSearchSheet();
    setSearchFocused(true);
  }, [dismissSearchSheet]);

  const handleRecentSearch = useCallback((recentQuery: string) => {
    setText(recentQuery);
    setSubmittedText(recentQuery);
    setSearchFocused(false);
    void rememberSearch(recentQuery);
  }, []);

  const searchSuggestions = useMemo(() => {
    const normalized = text.trim().toLocaleLowerCase();
    if (!normalized || searchMode !== "CENTERS") return [];
    return visibleCenters
      .filter((center) => {
        const haystack =
          `${center.name} ${center.category} ${center.type} ${center.subtype}`.toLocaleLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [searchMode, text, visibleCenters]);

  const handleNearbyToggle = useCallback(() => {
    if (!userLocation) return;
    setNearbyOnly((value) => !value);
  }, [userLocation]);

  const handleResetNorth = useCallback(() => {
    setResetNorthKey((value) => value + 1);
  }, []);

  const locationButtonLabel =
    locationStatus === "ready"
      ? "Volver a centrar el mapa en mi ubicación"
      : locationStatus === "requesting"
        ? "Obteniendo tu ubicación"
        : "Activar ubicación";
  const locationFocused =
    locationStatus === "ready" &&
    confirmedLocationFocusKey === focusLocationKey;
  const showLocationAction = locationStatus !== "ready" || !locationFocused;
  const retryCenters = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (searchMode === "CENTERS" && error && visibleCenters.length === 0) {
    return <ErrorState isRetrying={isFetching} onRetry={retryCenters} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.mapBackground }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CenterMap
        basemapMode="streets"
        centers={visibleCenters}
        establishments={mapEstablishments.data?.items ?? []}
        focusSelection={mapFeatureFocusSelection}
        onAttributionChange={handleAttributionChange}
        onBearingChange={setMapBearing}
        onCenterPress={(center) => {
          selectCenter(center);
        }}
        onEstablishmentPress={selectEstablishment}
        onOverlappingFeaturePress={handleOverlappingMapFeatures}
        onLocationFocusChange={handleLocationFocusChange}
        onViewportChange={handleViewportChange}
        resetNorthKey={resetNorthKey}
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
            <View style={styles.searchFieldWrap}>
              <TourismSearchField
                accessibilityLabel={
                  searchMode === "ESTABLISHMENTS"
                    ? "Buscar servicios cercanos"
                    : "Buscar atractivos"
                }
                onBlur={() => setSearchFocused(false)}
                onChangeText={setText}
                onClear={handleClearSearchInput}
                onFocus={() => setSearchFocused(true)}
                onSubmitEditing={handleSubmitSearch}
                placeholder="Buscar aquí"
                value={text}
              />
            </View>
            <NavigationMenuButton onPress={openMenu} />
          </View>
          {isSearchMode ? (
            <View style={styles.searchModeRow}>
              <TourismChoiceChip
                label="Atractivos"
                onPress={() => {
                  setSearchMode("CENTERS");
                  setSubmittedText("");
                  setSelectedCenterCode(null);
                  dismissSearchSheet();
                }}
                selected={searchMode === "CENTERS"}
              />
              <TourismChoiceChip
                label="Servicios cercanos"
                onPress={() => {
                  setSearchMode("ESTABLISHMENTS");
                  setSubmittedText("");
                  setSelectedCenterCode(null);
                  dismissSearchSheet();
                  if (!userLocation) void requestLocation();
                }}
                selected={searchMode === "ESTABLISHMENTS"}
              />
            </View>
          ) : null}
          {searchFocused ? (
            <SearchSuggestionsPanel
              history={searchHistory}
              onClearHistory={() => {
                void clearSearchHistory().then(() => setSearchHistory([]));
              }}
              onRecentPress={handleRecentSearch}
              onSuggestionPress={(center) => {
                void rememberSearch(center.name);
                selectCenter(center);
              }}
              query={text}
              suggestions={searchSuggestions}
            />
          ) : null}
          {!isSearchMode ? (
            <>
              <FilterChips
                label="Categorías de atractivos"
                options={catalog?.categories ?? []}
                selected={filters.categoryCode}
                onChange={handleCategoryChange}
              />
            </>
          ) : null}
          {searchMode === "CENTERS" &&
          (isFetching || mapEstablishments.isFetching) ? (
            <View
              accessible
              accessibilityLabel="Actualizando lugares turísticos"
              accessibilityRole="progressbar"
              pointerEvents="none"
              style={styles.refreshIndicator}
            >
              <ActivityIndicator color={colors.primaryStrong} size="small" />
            </View>
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
        <View style={styles.mapActionColumn}>
          <View style={styles.mapActionSlot}>
            {Math.abs(mapBearing) > 1 ? (
              <TourismCompassAction
                accessibilityLabel="Orientar mapa al norte"
                bearing={mapBearing}
                onPress={handleResetNorth}
                style={styles.locationAction}
              />
            ) : null}
          </View>
          <View style={styles.mapActionSlot}>
            <TourismIconAction
              accessibilityLabel="Abrir agente turístico"
              icon="bot"
              onPress={openAgent}
              selected={agentOpen}
              style={styles.locationAction}
            />
          </View>
          <View style={styles.mapActionSlot}>
            {showLocationAction ? (
              <TourismIconAction
                accessibilityLabel={locationButtonLabel}
                disabled={locationStatus === "requesting"}
                icon="locate"
                onPress={() => void handleLocateUser()}
                selected={false}
                slashed={locationStatus === "disabled"}
                style={styles.locationAction}
              />
            ) : null}
          </View>
        </View>
      </View>
      <View pointerEvents="box-none" style={styles.attributionLayer}>
        <MapAttributionButton
          bottom={0}
          left={0}
          onPress={() => mapAttributionHandlerRef.current?.()}
        />
      </View>
      {!selectedCenterCode && !selectedEstablishment && !mapFeatureSelection ? (
        <BottomSheetModal
          {...tourismFlexibleSheetBehavior}
          backgroundStyle={{ backgroundColor: colors.surface }}
          index={0}
          onDismiss={() => {
            const preserveSelection = preserveSelectionOnSearchCloseRef.current;
            preserveSelectionOnSearchCloseRef.current = false;
            searchSheetOpenRef.current = false;
            if (!preserveSelection) clearSearch();
          }}
          ref={sheetRef}
          snapPoints={tourismFlexibleSheetSnapPoints}
        >
          {submittedQuery && searchMode === "CENTERS" ? (
            <BottomSheetScrollView
              contentContainerStyle={[
                styles.sheetView,
                isLandscape && styles.sheetViewLandscape,
              ]}
              key={`search-${submittedQuery}`}
              showsVerticalScrollIndicator={false}
              style={styles.flexibleSheetScroll}
            >
              <SearchResultsSheet
                catalog={catalog}
                centers={visibleCenters}
                error={error ?? null}
                filters={filters}
                isFetching={isFetching}
                isPlaceholderData={isPlaceholderData}
                nearbyOnly={nearbyOnly}
                onChangeFilters={setFilters}
                onNearbyToggle={handleNearbyToggle}
                onRetry={() => void refetch()}
                onSelectCenter={selectCenter}
                query={submittedQuery}
                userLocation={userLocation}
              />
            </BottomSheetScrollView>
          ) : submittedQuery && searchMode === "ESTABLISHMENTS" ? (
            <BottomSheetScrollView
              contentContainerStyle={[
                styles.sheetView,
                isLandscape && styles.sheetViewLandscape,
              ]}
              key={`establishments-${submittedQuery}`}
              showsVerticalScrollIndicator={false}
              style={styles.flexibleSheetScroll}
            >
              <EstablishmentResultsSheet
                data={nearbyEstablishments.data}
                error={nearbyEstablishments.error as Error | null}
                hasLocation={Boolean(userLocation)}
                isFetching={nearbyEstablishments.isFetching}
                onRequestLocation={() => void handleLocateUser()}
                onRetry={() => void nearbyEstablishments.refetch()}
                query={submittedQuery}
              />
            </BottomSheetScrollView>
          ) : null}
        </BottomSheetModal>
      ) : null}
      {mapFeatureSelection ? (
        <MapFeatureSelectionSheet
          onClose={() => setMapFeatureSelection(null)}
          onSelect={handleMapFeatureSelection}
          selections={mapFeatureSelection}
        />
      ) : null}
      {selectedCenter ? (
        <CenterDetailSheet
          center={selectedCenter}
          detail={selectedCenterDetail}
          detailError={selectedCenterDetailError}
          detailPending={isSelectedCenterDetailPending}
          onClose={closeSelectedCenter}
          onOpenRoute={openRoute}
          onRequireAuth={openAuth}
          onRetryDetail={() => void refetchSelectedCenterDetail()}
          key={`${selectedCenter.code}-${isLandscape ? "landscape" : "portrait"}`}
        />
      ) : null}
      {selectedEstablishment ? (
        <EstablishmentDetailSheet
          establishment={selectedEstablishment}
          onClose={closeSelectedEstablishment}
          onOpenRoute={() => {
            const establishment = selectedEstablishment;
            closeSelectedEstablishment();
            router.push({
              pathname: "/route",
              params: {
                destinationLatitude: String(establishment.latitude),
                destinationLongitude: String(establishment.longitude),
                destinationName: establishment.name,
              },
            } as never);
          }}
        />
      ) : null}
      <BottomSheetModal
        {...tourismAgentSheetBehavior}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleComponent={null}
        index={0}
        onDismiss={() => {
          agentSheetOpenRef.current = false;
          setAgentOpen(false);
        }}
        ref={agentSheetRef}
        snapPoints={tourismAgentSheetSnapPoints}
      >
        <BottomSheetView style={styles.agentSheetView}>
          <SafeAreaView
            edges={["top", "bottom"]}
            style={[
              styles.agentSheetSafeArea,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[styles.agentHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.agentHeaderTitle, { color: colors.text }]}>
                Agente turístico
              </Text>
              <TourismIconAction
                accessibilityLabel="Cerrar agente turístico"
                icon="close"
                onPress={closeAgent}
                style={styles.agentCloseAction}
              />
            </View>
            <View style={styles.agentContent}>
              <AgentChatContent
                onOpenCenter={openAgentCenter}
                onStartRoute={openAgentRoute}
              />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

function SearchSuggestionsPanel({
  history,
  onClearHistory,
  onRecentPress,
  onSuggestionPress,
  query,
  suggestions,
}: Readonly<{
  history: readonly string[];
  onClearHistory: () => void;
  onRecentPress: (query: string) => void;
  onSuggestionPress: (center: PublicCenter) => void;
  query: string;
  suggestions: readonly PublicCenter[];
}>) {
  const colors = useTurismoPalette();
  const hasQuery = query.trim().length > 0;
  const showHistory = !hasQuery && history.length > 0;
  const showSuggestions = suggestions.length > 0;

  if (!showHistory && !showSuggestions && !hasQuery) return null;

  return (
    <View
      accessibilityLabel="Sugerencias e historial de búsqueda"
      style={[
        styles.searchSuggestionsPanel,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.searchSuggestionsScroll}
      >
        {showSuggestions ? (
          <View>
            <Text
              style={[styles.searchSuggestionsTitle, { color: colors.textMuted }]}
            >
              Coincidencias rápidas
            </Text>
            {suggestions.map((center) => (
              <Pressable
                accessibilityLabel={`Abrir ${center.name}`}
                accessibilityRole="button"
                key={center.code}
                onPress={() => onSuggestionPress(center)}
                style={({ pressed }) => [
                  styles.searchSuggestionRow,
                  pressed && styles.searchSuggestionRowPressed,
                ]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="mapPin"
                  size={turismoIconSizes.sm}
                />
                <View style={styles.searchSuggestionTextWrap}>
                  <Text
                    numberOfLines={1}
                    style={[styles.searchSuggestionName, { color: colors.text }]}
                  >
                    {center.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.searchSuggestionMeta, { color: colors.textMuted }]}
                  >
                    {[center.category, center.type].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <TurismoIcon
                  color={colors.textFaint}
                  name="chevronRight"
                  size={turismoIconSizes.sm}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {showHistory ? (
          <View>
            <View style={styles.searchSuggestionsHeader}>
              <Text
                style={[styles.searchSuggestionsTitle, { color: colors.textMuted }]}
              >
                Búsquedas recientes
              </Text>
              <Pressable
                accessibilityLabel="Borrar búsquedas recientes"
                accessibilityRole="button"
                hitSlop={6}
                onPress={onClearHistory}
                style={styles.searchSuggestionsClear}
              >
                <Text
                  style={[styles.searchSuggestionsClearText, { color: colors.primaryStrong }]}
                >
                  Borrar
                </Text>
              </Pressable>
            </View>
            {history.map((recentQuery) => (
              <Pressable
                accessibilityLabel={`Repetir búsqueda ${recentQuery}`}
                accessibilityRole="button"
                key={recentQuery}
                onPress={() => onRecentPress(recentQuery)}
                style={({ pressed }) => [
                  styles.searchSuggestionRow,
                  pressed && styles.searchSuggestionRowPressed,
                ]}
              >
                <TurismoIcon
                  color={colors.textMuted}
                  name="history"
                  size={turismoIconSizes.sm}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.searchSuggestionName, { color: colors.text }]}
                >
                  {recentQuery}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {hasQuery && !showSuggestions ? (
          <Text style={[styles.searchSuggestionsEmpty, { color: colors.textMuted }]}>
            Presiona buscar para ver todos los resultados.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function CenterDetailSheet({
  center,
  detail,
  detailError,
  detailPending,
  onClose,
  onOpenRoute,
  onRequireAuth,
  onRetryDetail,
}: Readonly<{
  center: PublicCenter;
  detail?: PublicCenterDetail;
  detailError: Error | null;
  detailPending: boolean;
  onClose: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
  onRetryDetail: () => void;
}>) {
  const colors = useTurismoPalette();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <BottomSheet
      {...tourismFlexibleSheetBehavior}
      backgroundStyle={{ backgroundColor: colors.surface }}
      index={0}
      onClose={onClose}
      snapPoints={tourismFlexibleSheetSnapPoints}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.sheetView,
          styles.centerSheetContent,
          isLandscape && styles.sheetViewLandscape,
        ]}
        key={center.code}
        showsVerticalScrollIndicator={false}
        style={styles.centerSheetScroll}
      >
        <PlaceSheet
          center={center}
          code={center.code}
          detail={detail}
          detailError={detailError}
          detailPending={detailPending}
          onClose={onClose}
          onOpenRoute={onOpenRoute}
          onRequireAuth={onRequireAuth}
          onRetryDetail={onRetryDetail}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function PlaceSheet({
  center,
  code,
  detail,
  detailError,
  detailPending,
  onClose,
  onOpenRoute,
  onRequireAuth,
  onRetryDetail,
}: Readonly<{
  center: PublicCenter;
  code: string;
  detail?: PublicCenterDetail;
  detailError: Error | null;
  detailPending: boolean;
  onClose: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
  onRetryDetail: () => void;
}>) {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const opinions = useCenterOpinions(code);
  const [activeTab, setActiveTab] = useState<PlaceTab>("information");
  const savedCenters = useSavedCenters();
  const savedMutation = useSavedCenterMutation();
  const pagerRef = useRef<ScrollView>(null);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [pageHeights, setPageHeights] = useState<
    Partial<Record<PlaceTab, number>>
  >({});
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<PlaceTab>>(
    () => new Set<PlaceTab>(["information"]),
  );
  const heroPhoto = detail?.photos[0];
  const saved =
    savedCenters.data?.some(
      (savedCenter) => savedCenter.code === center.code,
    ) ?? false;
  const markTabVisited = useCallback((tab: PlaceTab) => {
    setActiveTab(tab);
    setVisitedTabs((current) => {
      if (current.has(tab)) return current;
      return new Set([...current, tab]);
    });
  }, []);
  const changeTab = useCallback(
    (tab: PlaceTab) => {
      markTabVisited(tab);
      const index = placeTabOrder.indexOf(tab);
      if (pagerWidth > 0) {
        pagerRef.current?.scrollTo({
          animated: true,
          x: index * pagerWidth,
        });
      }
    },
    [markTabVisited, pagerWidth],
  );
  const handlePagerEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (pagerWidth <= 0) return;
      const index = Math.max(
        0,
        Math.min(
          placeTabOrder.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / pagerWidth),
        ),
      );
      markTabVisited(placeTabOrder[index]);
    },
    [markTabVisited, pagerWidth],
  );
  const updatePageHeight = useCallback((tab: PlaceTab, height: number) => {
    const nextHeight = Math.ceil(height);
    setPageHeights((current) =>
      current[tab] === nextHeight ? current : { ...current, [tab]: nextHeight },
    );
  }, []);
  const activePageHeight = pageHeights[activeTab] ?? 0;

  return (
    <View style={styles.placeSheet}>
      <View style={styles.placeHero}>
        {heroPhoto ? (
          <Image
            accessibilityLabel={
              heroPhoto.description ?? `Fotografía de ${center.name}`
            }
            resizeMethod="resize"
            resizeMode="cover"
            source={{ uri: resolveMediaUrl(heroPhoto.url) }}
            style={styles.placeHeroImage}
          />
        ) : (
          <View
            style={[
              styles.placeHeroFallback,
              { backgroundColor: colors.mapBackground },
            ]}
          >
            <TurismoIcon
              color={colors.primaryStrong}
              name="mapPinned"
              size={turismoIconSizes.xl}
            />
          </View>
        )}
        <View pointerEvents="none" style={styles.placeHeroFade}>
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient
                id="placeHeroFadeGradient"
                x1="0%"
                x2="0%"
                y1="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={colors.surface} stopOpacity={0} />
                <Stop offset="52%" stopColor={colors.surface} stopOpacity={0} />
                <Stop
                  offset="86%"
                  stopColor={colors.surface}
                  stopOpacity={0.78}
                />
                <Stop
                  offset="100%"
                  stopColor={colors.surface}
                  stopOpacity={1}
                />
              </LinearGradient>
            </Defs>
            <Rect
              fill="url(#placeHeroFadeGradient)"
              height="100%"
              width="100%"
              x="0"
              y="0"
            />
          </Svg>
        </View>
        <View style={styles.placeHeroClose}>
          <TourismIconAction
            accessibilityLabel="Volver a explorar"
            icon="arrowLeft"
            onPress={onClose}
          />
        </View>
      </View>
      <Text style={[styles.placeTitle, { color: colors.text }]}>
        {center.name}
      </Text>
      <View style={styles.placeActions}>
        <CenterRatingSummary
          inline
          onPress={() => changeTab("opinions")}
          summary={opinions.data?.summary}
        />
        <View style={styles.placeActionGroup}>
          <Pressable
            accessibilityLabel={
              saved ? "Quitar de guardados" : "Guardar centro turístico"
            }
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            hitSlop={4}
            onPress={() => {
              if (auth.status !== "authenticated") {
                onRequireAuth();
                return;
              }
              savedMutation.mutate({ center, saved });
            }}
            style={({ pressed }) => [
              styles.placeAction,
              pressed && styles.placeActionPressed,
            ]}
          >
            <TurismoIcon
              color={saved ? colors.primaryStrong : colors.primary}
              fill={saved ? colors.primaryStrong : "none"}
              fillOpacity={saved ? 1 : undefined}
              name="bookmark"
              size={turismoIconSizes.md}
            />
          </Pressable>
        </View>
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
        <>
          <PlaceTabButton activeTab={activeTab} onChange={changeTab} />
          <View
            onLayout={(event) => setPagerWidth(event.nativeEvent.layout.width)}
            style={[
              styles.placePagerViewport,
              activePageHeight > 0 && { height: activePageHeight },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.placePagerContent}
              horizontal
              nestedScrollEnabled
              onMomentumScrollEnd={handlePagerEnd}
              pagingEnabled
              ref={pagerRef}
              showsHorizontalScrollIndicator={false}
              style={styles.placePager}
            >
              <View
                onLayout={(event) =>
                  updatePageHeight(
                    "information",
                    event.nativeEvent.layout.height,
                  )
                }
                style={[styles.placePage, { width: pagerWidth || "100%" }]}
              >
                {visitedTabs.has("information") ? (
                  <PlaceInformation detail={detail} />
                ) : null}
              </View>
              <View
                onLayout={(event) =>
                  updatePageHeight("opinions", event.nativeEvent.layout.height)
                }
                style={[styles.placePage, { width: pagerWidth || "100%" }]}
              >
                {visitedTabs.has("opinions") ? (
                  <PlaceOpinions
                    active={activeTab === "opinions"}
                    code={code}
                    onRequireAuth={onRequireAuth}
                  />
                ) : null}
              </View>
              <View
                onLayout={(event) =>
                  updatePageHeight("photos", event.nativeEvent.layout.height)
                }
                style={[styles.placePage, { width: pagerWidth || "100%" }]}
              >
                {visitedTabs.has("photos") ? (
                  <PlacePhotos photos={detail.photos} />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

function CenterRatingSummary({
  inline = false,
  onPress,
  summary,
}: Readonly<{
  inline?: boolean;
  onPress: () => void;
  summary?: OpinionRatingSummary;
}>) {
  const colors = useTurismoPalette();
  if (!summary || summary.averageRating === null || summary.total === 0) {
    return null;
  }
  const opinionLabel = summary.total === 1 ? "opinión" : "opiniones";

  return (
    <Pressable
      accessibilityLabel={`${formatRating(summary.averageRating)} de 5 estrellas, ${summary.total} ${opinionLabel}`}
      accessibilityRole="button"
      hitSlop={turismoMetrics.chipHitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingSummary,
        inline && styles.ratingSummaryInline,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && styles.ratingPressed,
      ]}
    >
      <TurismoIcon color={colors.warm} name="star" size={turismoIconSizes.sm} />
      <Text style={[styles.ratingValue, { color: colors.text }]}>
        {formatRating(summary.averageRating)}
      </Text>
      <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
        ({summary.total} {opinionLabel})
      </Text>
    </Pressable>
  );
}

function PlaceTabButton({
  activeTab,
  onChange,
}: Readonly<{
  activeTab: PlaceTab;
  onChange: (tab: PlaceTab) => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <View style={[styles.placeTabs, { borderBottomColor: colors.border }]}>
      {(
        [
          ["information", "Información"],
          ["opinions", "Opiniones"],
          ["photos", "Fotos"],
        ] as const
      ).map(([tab, label]) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}
          hitSlop={4}
          key={tab}
          onPress={() => onChange(tab)}
          style={({ pressed }) => [
            styles.placeTab,
            pressed && styles.placeTabPressed,
            activeTab === tab && { borderBottomColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.placeTabLabel,
              {
                color:
                  activeTab === tab ? colors.primaryStrong : colors.textMuted,
              },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlaceInformation({
  detail,
}: Readonly<{ detail: PublicCenterDetail }>) {
  const colors = useTurismoPalette();
  return (
    <>
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

function PlacePhotos({
  photos,
}: Readonly<{ photos: PublicCenterDetail["photos"] }>) {
  const colors = useTurismoPalette();
  if (!photos.length) {
    return (
      <PlaceSection icon="mapPinned" title="Fotos">
        <PlaceEmptyState text="Todavía no hay imágenes publicadas para este centro." />
      </PlaceSection>
    );
  }
  return (
    <View style={styles.placePhotoGrid}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[
            styles.placePhotoTile,
            { backgroundColor: colors.surfaceMuted },
          ]}
        >
          <Image
            accessibilityLabel={photo.description ?? "Fotografía del atractivo"}
            resizeMethod="resize"
            resizeMode="cover"
            source={{ uri: resolveMediaUrl(photo.url) }}
            style={styles.placePhotoImage}
          />
          {photo.description ? (
            <Text style={[styles.placePhotoCaption, { color: colors.text }]}>
              {photo.description}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function PlaceOpinions({
  active,
  code,
  onRequireAuth,
}: Readonly<{
  active: boolean;
  code: string;
  onRequireAuth: () => void;
}>) {
  return (
    <CenterOpinions active={active} code={code} onRequireAuth={onRequireAuth} />
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
    <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
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
    <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
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
        <View style={styles.detailBulletList}>
          {values.map((value) => (
            <Text
              key={value}
              style={[styles.detailBulletText, { color: colors.text }]}
            >
              <Text style={{ color: colors.primaryStrong }}>• </Text>
              {value}
            </Text>
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

function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function formatPrice(from: number | null, to: number | null): string {
  if (from !== null && to !== null && from !== to)
    return `$${from.toFixed(2)} – $${to.toFixed(2)}`;
  const value = from ?? to;
  return value === null ? "No especificado" : `$${value.toFixed(2)}`;
}

function ErrorState({
  isRetrying,
  onRetry,
}: Readonly<{ isRetrying: boolean; onRetry: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <TurismoIcon color={colors.danger} name="wifiOff" size={32} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        No pudimos cargar el mapa turístico.
      </Text>
      {isRetrying ? (
        <View style={styles.detailState}>
          <ActivityIndicator color={colors.primaryStrong} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Actualizando lugares…
          </Text>
        </View>
      ) : null}
      <TourismActionButton
        icon="refresh"
        label={isRetrying ? "Actualizando…" : "Reintentar"}
        disabled={isRetrying}
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
  searchFieldWrap: { flex: 1 },
  searchModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
  },
  searchSuggestionsPanel: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    elevation: 8,
    maxHeight: 300,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  searchSuggestionsScroll: { maxHeight: 300 },
  searchSuggestionsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: turismoSpacing.md,
  },
  searchSuggestionsTitle: {
    ...turismoTypography.caption,
    fontWeight: "700",
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
  searchSuggestionsClear: {
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.md,
  },
  searchSuggestionsClearText: {
    ...turismoTypography.caption,
    fontWeight: "700",
  },
  searchSuggestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.md,
  },
  searchSuggestionRowPressed: { opacity: 0.68 },
  searchSuggestionTextWrap: { flex: 1, minWidth: 0 },
  searchSuggestionName: { ...turismoTypography.label },
  searchSuggestionMeta: { ...turismoTypography.caption },
  searchSuggestionsEmpty: {
    ...turismoTypography.caption,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.md,
  },
  refreshIndicator: { alignSelf: "center" },
  mapActionLayer: {
    alignItems: "flex-end",
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
  mapActionColumn: {
    gap: turismoSpacing.xs,
    height: turismoMetrics.controlLg * 3 + turismoSpacing.xs * 2,
  },
  mapActionSlot: {
    height: turismoMetrics.controlLg,
    width: turismoMetrics.controlLg,
  },
  attributionLayer: {
    bottom: 0,
    elevation: 20,
    height: 44,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  locationAction: {
    height: turismoMetrics.controlLg,
    width: turismoMetrics.controlLg,
  },
  sheetView: {
    alignSelf: "center",
    flexGrow: 1,
    padding: turismoSpacing.lg,
    width: "100%",
  },
  flexibleSheetScroll: { flex: 1 },
  sheetViewLandscape: { maxWidth: turismoMetrics.sheetMaxWidth },
  centerSheetContent: {
    paddingBottom: turismoSpacing.xxl + turismoMetrics.iconButtonLg,
    paddingTop: 0,
  },
  centerSheetScroll: { flex: 1 },
  agentSheetView: {
    flex: 1,
    height: "100%",
    minHeight: 0,
  },
  agentSheetSafeArea: { flex: 1, minHeight: 0 },
  agentHeader: {
    alignItems: "center",
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  agentHeaderTitle: { ...turismoTypography.heading },
  agentCloseAction: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
  },
  agentContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
  placeSheet: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xl },
  placeHero: {
    aspectRatio: 1.35,
    alignSelf: "stretch",
    marginHorizontal: -turismoSpacing.lg,
    marginTop: 0,
    overflow: "hidden",
    position: "relative",
  },
  placeHeroImage: { height: "100%", width: "100%" },
  placeHeroFallback: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  placeHeroFade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  placeHeroClose: {
    left: turismoSpacing.xxl,
    position: "absolute",
    top: turismoSpacing.md,
    zIndex: 2,
  },
  placeActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  placeActionGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  placeAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    width: turismoMetrics.touchTarget,
  },
  placeActionPressed: { opacity: 0.68 },
  placeTitle: { ...turismoTypography.title },
  ratingSummary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: turismoRadii.xs,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    minHeight: turismoMetrics.chipHeight,
    paddingHorizontal: turismoSpacing.xs,
  },
  ratingSummaryInline: { alignSelf: "center" },
  ratingValue: { ...turismoTypography.label },
  ratingCount: { ...turismoTypography.caption },
  ratingPressed: { opacity: 0.72 },
  actions: { flexDirection: "row", gap: turismoSpacing.xs },
  routeAction: { flex: 1 },
  placeTabs: {
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.lg,
  },
  placeTab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: turismoMetrics.borderWidthStrong,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.xs,
  },
  placeTabPressed: { opacity: 0.72 },
  placeTabLabel: { ...turismoTypography.label },
  placePager: { width: "100%" },
  placePagerContent: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  placePagerViewport: { overflow: "hidden", width: "100%" },
  placePage: { flexShrink: 0, gap: turismoSpacing.md },
  placePhotoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.sm,
  },
  placePhotoTile: {
    borderRadius: turismoRadii.md,
    overflow: "hidden",
    width: "48%",
  },
  placePhotoImage: { aspectRatio: 1.15, width: "100%" },
  placePhotoCaption: {
    ...turismoTypography.caption,
    padding: turismoSpacing.xs,
  },
  detailState: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    paddingVertical: turismoSpacing.lg,
  },
  detailStateText: { ...turismoTypography.body, textAlign: "center" },
  detailSection: {
    borderBottomWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    minWidth: 0,
    paddingBottom: turismoSpacing.lg,
    paddingTop: turismoSpacing.md,
  },
  detailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  detailSectionTitle: { ...turismoTypography.heading },
  detailSectionContent: { gap: turismoSpacing.sm, minWidth: 0 },
  detailInfoRow: { gap: turismoSpacing.xxs },
  detailInfoLabel: { ...turismoTypography.caption },
  detailInfoValue: { ...turismoTypography.body },
  detailBulletList: {
    alignSelf: "stretch",
    gap: turismoSpacing.xs,
    minWidth: 0,
    width: "100%",
  },
  detailBulletText: {
    ...turismoTypography.body,
    lineHeight: 20,
    minWidth: 0,
    width: "100%",
  },
  detailEmptyText: { ...turismoTypography.body },
  entryLoading: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  entryLoadingText: { ...turismoTypography.body, textAlign: "center" },
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
