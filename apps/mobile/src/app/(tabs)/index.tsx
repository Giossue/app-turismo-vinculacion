import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Defs, LinearGradient, Rect, Stop, Svg } from "react-native-svg";
import { Redirect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolveMediaUrl } from "@/core/api/media-url";
import { queryKeys } from "@/core/api/query-keys";
import type { GeoBounds, GeoCoordinate } from "@/core/geo/types";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismCompassAction,
  TourismChoiceChip,
  TourismIconAction,
  TourismSearchField,
} from "@/core/ui/tourism-controls";
import {
  TourismBottomSheet,
  TourismBottomSheetModal,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismInfoRow, TourismSection } from "@/core/ui/tourism-content";
import { TourismTabs } from "@/core/ui/tourism-tabs";
import {
  TourismMenuButton as NavigationMenuButton,
  useTourismMenu,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoFixedColors,
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import {
  formatAdmissionPrice,
  formatRating,
} from "@/features/centers/domain/center-format";
import { useMapEstablishments } from "@/features/establishments/application/use-map-establishments";
import { useNearbyEstablishments } from "@/features/establishments/application/use-nearby-establishments";
import {
  getEstablishmentKey,
  type PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";
import { defaultEstablishmentPin } from "@/features/establishments/presentation/establishment-pins";
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
import { usePublicSearch } from "@/features/search/application/use-public-search";
import { useSearchHistory } from "@/features/search/application/use-search-history";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import type { OpinionRatingSummary } from "@/features/opinions/domain/opinion";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import { CenterMap } from "@/features/map/presentation/center-map";
import { MapAttributionButton } from "@/features/map/presentation/map-attribution-button";
import { MapFeatureSelectionSheet } from "@/features/map/presentation/map-feature-selection-sheet";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import { AgentChatContent } from "@/features/agent/presentation/agent-chat-content";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import {
  readAuthEntryChoice,
  type AuthEntryChoice,
} from "@/features/auth/data/auth-entry-storage";
import { useUserLocation } from "@/core/location/use-user-location";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import type { RouteMode } from "@/features/routing/domain/routing";
import { buildRouteHref } from "@/features/routing/presentation/route-href";

type ExploreSearchMode = "CENTERS" | "ESTABLISHMENTS";
type PlaceTab = "information" | "opinions" | "photos";
const placeTabOrder = ["information", "opinions", "photos"] as const;
const placeTabs = [
  { label: "Información", value: "information" },
  { label: "Opiniones", value: "opinions" },
  { label: "Fotos", value: "photos" },
] as const;

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
  const {
    clear: clearSearchHistory,
    history: searchHistory,
    remember: rememberSearch,
  } = useSearchHistory();
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [resetNorthKey, setResetNorthKey] = useState(0);
  const [searchFocusCoordinate, setSearchFocusCoordinate] =
    useState<GeoCoordinate | null>(null);
  const [searchFocusCoordinateKey, setSearchFocusCoordinateKey] = useState(0);
  const [selectedCenterCode, setSelectedCenterCode] = useState<string | null>(
    null,
  );
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<PublicMapEstablishment | null>(null);
  const [mapViewport, setMapViewport] = useState<GeoBounds | null>(null);
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
    void requestLocation({ forceRefresh: true });
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
  const mapEstablishments = useMapEstablishments(mapViewport);
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
  const publicSearch = usePublicSearch(
    searchMode === "CENTERS" ? submittedQuery : "",
    null,
  );
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
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCenters }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.mapEstablishments,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.discoveryCatalog }),
      ]);
    },
    [queryClient],
  );
  // Conservamos los centros ya confirmados mientras se revalida la consulta;
  // una respuesta remota vacía sí los reemplaza al terminar correctamente.
  const visibleCenters = useMemo(
    () =>
      searchMode === "CENTERS" && error && centers.length === 0 ? [] : centers,
    [centers, error, searchMode],
  );
  const searchResultsError =
    error ?? (visibleCenters.length === 0 ? publicSearch.error : null);

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

  const closeFocusedSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchFocused(false);
  }, []);

  const beginFocusedSearch = useCallback(() => {
    setSearchFocused(true);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
    setMapFeatureSelection(null);
    setMapFeatureFocusSelection(null);
    setSearchFocusCoordinate(null);
    dismissSearchSheet();
  }, [dismissSearchSheet]);

  useEffect(() => {
    if (!searchFocused) return;

    const keyboardSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setSearchFocused(false);
    });

    return () => keyboardSubscription.remove();
  }, [searchFocused]);

  useEffect(() => {
    if (searchFocused) return;
    Keyboard.dismiss();
  }, [searchFocused]);

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
    setSearchFocusCoordinate(null);
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
      setSearchFocusCoordinate(null);
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
  const selectSearchPlace = useCallback(
    (place: PublicSearchResult) => {
      if (place.kind === "center" && place.centerCode) {
        const center = visibleCenters.find(
          (candidate) => candidate.code === place.centerCode,
        );
        if (center) {
          selectCenter(center);
          return;
        }
        if (
          place.category &&
          place.type &&
          place.subtype &&
          place.categoryCode &&
          place.typeCode &&
          place.subtypeCode &&
          place.provinceCode &&
          place.cantonCode &&
          place.parishCode
        ) {
          selectCenter({
            code: place.centerCode,
            name: place.title,
            description: null,
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.category,
            type: place.type,
            subtype: place.subtype,
            hierarchy: place.hierarchy ?? null,
            categoryCode: place.categoryCode,
            typeCode: place.typeCode,
            subtypeCode: place.subtypeCode,
            provinceCode: place.provinceCode,
            cantonCode: place.cantonCode,
            parishCode: place.parishCode,
            hierarchyCode: place.hierarchyCode ?? null,
          });
        }
        return;
      }
      if (place.kind === "establishment") {
        selectEstablishment({
          name: place.title,
          category: place.category ?? null,
          categoryLabel: place.subtitle || place.category,
          latitude: place.latitude,
          longitude: place.longitude,
          approximate: place.approximate ?? false,
          icon: place.icon ?? defaultEstablishmentPin.key,
          color: place.color ?? defaultEstablishmentPin.color,
        });
        return;
      }

      dismissSearchSheet();
      setSelectedCenterCode(null);
      setSelectedEstablishment(null);
      setText(place.title);
      setSubmittedText("");
      setSearchFocusCoordinate({
        latitude: place.latitude,
        longitude: place.longitude,
      });
      setSearchFocusCoordinateKey((value) => value + 1);
    },
    [dismissSearchSheet, selectCenter, selectEstablishment, visibleCenters],
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
    if (searchFocused) {
      closeFocusedSearch();
      return true;
    }
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
    closeFocusedSearch,
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
    searchFocused,
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
    if (agentOpen || searchFocused || !submittedQuery) return;
    presentSearchSheet();
  }, [agentOpen, presentSearchSheet, searchFocused, submittedQuery]);

  const handleViewportChange = useCallback((bounds: GeoBounds) => {
    setConfirmedLocationFocusKey(null);
    setMapViewport(bounds);
  }, []);

  const openRoute = () => {
    if (!selectedCenter) return;

    // La ficha es un overlay transitorio del mapa: debe desaparecer antes de
    // cambiar de pantalla para no quedar montada sobre la ruta.
    dismissSearchSheet();
    setSelectedCenterCode(null);
    router.push(buildRouteHref(selectedCenter));
  };

  const handleLocateUser = useCallback(async () => {
    setConfirmedLocationFocusKey(null);
    const coordinate = await requestLocation({ forceRefresh: true });
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
      router.push(buildLoginHref("/"));
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
    router.push(buildLoginHref("/"));
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
    (destination: AgentRouteDestination, mode: RouteMode) => {
      closeAgent();
      router.push(buildRouteHref(destination, mode));
    },
    [closeAgent, router],
  );

  const handleSubmitSearch = useCallback(() => {
    const nextQuery = text.trim();
    if (nextQuery.length < 2) return;
    Keyboard.dismiss();
    void rememberSearch(nextQuery);
    setSubmittedText(nextQuery);
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
  }, [rememberSearch, text]);

  const handleClearSearchInput = useCallback(() => {
    setText("");
    setSubmittedText("");
    dismissSearchSheet();
    setSearchFocused(true);
  }, [dismissSearchSheet]);

  const handleRecentSearch = useCallback(
    (recentQuery: string) => {
      setText(recentQuery);
      setSubmittedText(recentQuery);
      setSearchFocused(false);
      void rememberSearch(recentQuery);
    },
    [rememberSearch],
  );

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

  if (
    searchMode === "CENTERS" &&
    error &&
    visibleCenters.length === 0 &&
    !publicSearch.data
  ) {
    return <ErrorState isRetrying={isFetching} onRetry={retryCenters} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.map.background }]}>
      <CenterMap
        centers={visibleCenters}
        establishments={mapEstablishments.data?.items ?? []}
        focusCoordinate={searchFocusCoordinate}
        focusCoordinateKey={searchFocusCoordinateKey}
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
        selectedEstablishmentKey={
          selectedEstablishment
            ? getEstablishmentKey(selectedEstablishment)
            : null
        }
        focusLocationKey={focusLocationKey}
        userLocation={userLocation}
      />
      {!searchFocused ? (
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
                  onChangeText={setText}
                  onClear={handleClearSearchInput}
                  onFocus={beginFocusedSearch}
                  onSubmitEditing={handleSubmitSearch}
                  placeholder="Buscar aquí"
                  value={text}
                />
              </View>
              <NavigationMenuButton onPress={openMenu} />
            </View>
            {isSearchMode ? (
              <SearchModeChips
                onSelectCenters={() => {
                  setSearchMode("CENTERS");
                  setSubmittedText("");
                  setSelectedCenterCode(null);
                  dismissSearchSheet();
                }}
                onSelectEstablishments={() => {
                  setSearchMode("ESTABLISHMENTS");
                  setSubmittedText("");
                  setSelectedCenterCode(null);
                  dismissSearchSheet();
                  if (!userLocation) {
                    void requestLocation({ forceRefresh: true });
                  }
                }}
                searchMode={searchMode}
              />
            ) : null}
            {!isSearchMode ? (
              <FilterChips
                label="Categorías de atractivos"
                options={catalog?.categories ?? []}
                selected={filters.categoryCode}
                onChange={handleCategoryChange}
              />
            ) : null}
            {searchMode === "CENTERS" &&
            (isFetching ||
              publicSearch.isFetching ||
              mapEstablishments.isFetching) ? (
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
      ) : (
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[
            styles.fullScreenSearchOverlay,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.fullScreenSearchHeader}>
            <TourismIconAction
              accessibilityLabel="Volver al mapa"
              icon="arrowLeft"
              onPress={closeFocusedSearch}
              style={styles.searchBackAction}
              variant="ghost"
            />
            <View style={styles.searchFieldWrap}>
              <TourismSearchField
                accessibilityLabel={
                  searchMode === "ESTABLISHMENTS"
                    ? "Buscar servicios cercanos"
                    : "Buscar atractivos"
                }
                autoFocus
                onChangeText={setText}
                onClear={handleClearSearchInput}
                onFocus={beginFocusedSearch}
                onSubmitEditing={handleSubmitSearch}
                placeholder="Buscar aquí"
                value={text}
              />
            </View>
          </View>
          <SearchSuggestionsPanel
            fullScreen
            history={searchHistory}
            onClearHistory={() => void clearSearchHistory()}
            onRecentPress={handleRecentSearch}
            onSuggestionPress={(center) => {
              void rememberSearch(center.name);
              setSearchFocused(false);
              selectCenter(center);
            }}
            query={text}
            suggestions={searchSuggestions}
          />
        </SafeAreaView>
      )}
      {!searchFocused ? (
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
      ) : null}
      {!searchFocused ? (
        <View pointerEvents="box-none" style={styles.attributionLayer}>
          <MapAttributionButton
            bottom={0}
            left={0}
            onPress={() => mapAttributionHandlerRef.current?.()}
          />
        </View>
      ) : null}
      {!searchFocused &&
      !selectedCenterCode &&
      !selectedEstablishment &&
      !mapFeatureSelection ? (
        <TourismBottomSheetModal
          onDismiss={() => {
            const preserveSelection = preserveSelectionOnSearchCloseRef.current;
            preserveSelectionOnSearchCloseRef.current = false;
            searchSheetOpenRef.current = false;
            if (!preserveSelection) clearSearch();
          }}
          ref={sheetRef}
        >
          {submittedQuery && searchMode === "CENTERS" ? (
            <TourismSheetScrollView
              key={`search-${submittedQuery}`}
              landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
            >
              <SearchResultsSheet
                catalog={catalog}
                centers={visibleCenters}
                error={searchResultsError}
                filters={filters}
                isFetching={isFetching || publicSearch.isFetching}
                isPlaceholderData={isPlaceholderData}
                nearbyOnly={nearbyOnly}
                onChangeFilters={setFilters}
                onNearbyToggle={handleNearbyToggle}
                onRetry={() => void refetch()}
                onSelectPlace={selectSearchPlace}
                onSelectCenter={selectCenter}
                places={publicSearch.data?.items ?? []}
                query={submittedQuery}
                userLocation={userLocation}
              />
            </TourismSheetScrollView>
          ) : submittedQuery && searchMode === "ESTABLISHMENTS" ? (
            <TourismSheetScrollView
              key={`establishments-${submittedQuery}`}
              landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
            >
              <EstablishmentResultsSheet
                data={nearbyEstablishments.data}
                error={nearbyEstablishments.error}
                hasLocation={Boolean(userLocation)}
                isFetching={nearbyEstablishments.isFetching}
                onRequestLocation={() => void handleLocateUser()}
                onRetry={() => void nearbyEstablishments.refetch()}
                query={submittedQuery}
              />
            </TourismSheetScrollView>
          ) : null}
        </TourismBottomSheetModal>
      ) : null}
      {!searchFocused && mapFeatureSelection ? (
        <MapFeatureSelectionSheet
          onClose={() => setMapFeatureSelection(null)}
          onSelect={handleMapFeatureSelection}
          selections={mapFeatureSelection}
        />
      ) : null}
      {!searchFocused && selectedCenter ? (
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
      {!searchFocused && selectedEstablishment ? (
        <EstablishmentDetailSheet
          establishment={selectedEstablishment}
          onClose={closeSelectedEstablishment}
          onOpenRoute={() => {
            const establishment = selectedEstablishment;
            closeSelectedEstablishment();
            router.push(buildRouteHref(establishment));
          }}
        />
      ) : null}
      <TourismBottomSheetModal
        onDismiss={() => {
          agentSheetOpenRef.current = false;
          setAgentOpen(false);
        }}
        ref={agentSheetRef}
        variant="agent"
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
                variant="ghost"
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
      </TourismBottomSheetModal>
    </View>
  );
}

function SearchModeChips({
  onSelectCenters,
  onSelectEstablishments,
  searchMode,
}: Readonly<{
  onSelectCenters: () => void;
  onSelectEstablishments: () => void;
  searchMode: ExploreSearchMode;
}>) {
  return (
    <View style={styles.searchModeRow}>
      <TourismChoiceChip
        label="Atractivos"
        onPress={onSelectCenters}
        selected={searchMode === "CENTERS"}
      />
      <TourismChoiceChip
        label="Servicios cercanos"
        onPress={onSelectEstablishments}
        selected={searchMode === "ESTABLISHMENTS"}
      />
    </View>
  );
}

function SearchSuggestionsPanel({
  fullScreen = false,
  history,
  onClearHistory,
  onRecentPress,
  onSuggestionPress,
  query,
  suggestions,
}: Readonly<{
  fullScreen?: boolean;
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
        fullScreen && styles.searchSuggestionsPanelFullScreen,
        {
          backgroundColor: fullScreen ? colors.background : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={[
          styles.searchSuggestionsScroll,
          fullScreen && styles.searchSuggestionsScrollFullScreen,
        ]}
      >
        {showSuggestions ? (
          <View>
            <Text
              style={[
                styles.searchSuggestionsTitle,
                { color: colors.textMuted },
              ]}
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
                    style={[
                      styles.searchSuggestionName,
                      { color: colors.text },
                    ]}
                  >
                    {center.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.searchSuggestionMeta,
                      { color: colors.textMuted },
                    ]}
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
                style={[
                  styles.searchSuggestionsTitle,
                  { color: colors.textMuted },
                ]}
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
                  style={[
                    styles.searchSuggestionsClearText,
                    { color: colors.primaryStrong },
                  ]}
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
          <Text
            style={[styles.searchSuggestionsEmpty, { color: colors.textMuted }]}
          >
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
  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView
        contentStyle={styles.centerSheetContent}
        key={center.code}
        landscapeMaxWidth={turismoMetrics.sheetMaxWidth}
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
      </TourismSheetScrollView>
    </TourismBottomSheet>
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
              { backgroundColor: colors.map.background },
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
          <TourismTabs
            items={placeTabs}
            onChange={changeTab}
            value={activeTab}
          />
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

function PlaceInformation({
  detail,
}: Readonly<{ detail: PublicCenterDetail }>) {
  const colors = useTurismoPalette();
  return (
    <>
      {detail.description ? (
        <TourismSection icon="circleHelp" title="Descripción" variant="divided">
          <Text style={[styles.detailInfoValue, { color: colors.text }]}>
            {detail.description}
          </Text>
        </TourismSection>
      ) : null}
      <TourismSection
        icon="mapPinned"
        title="Información del lugar"
        variant="divided"
      >
        <TourismInfoRow label="Zona turística" value={detail.touristZone} />
        <TourismInfoRow label="Categoría" value={detail.category} />
        <TourismInfoRow label="Tipo" value={detail.type} />
        <TourismInfoRow label="Subtipo" value={detail.subtype} />
        {detail.address ? (
          <TourismInfoRow label="Dirección" value={detail.address} />
        ) : null}
        {detail.altitudeMeters !== null ? (
          <TourismInfoRow
            label="Altitud"
            value={`${detail.altitudeMeters} msnm`}
          />
        ) : null}
      </TourismSection>
      <TourismSection
        icon="calendar"
        title="Ingreso y horario"
        variant="divided"
      >
        {detail.admission ? (
          <>
            <TourismInfoRow
              label="Acceso"
              value={`${detail.admission.type} · ${detail.admission.attention}`}
            />
            {detail.admission.opensAt || detail.admission.closesAt ? (
              <TourismInfoRow
                label="Horario"
                value={`${detail.admission.opensAt ?? "--:--"} – ${detail.admission.closesAt ?? "--:--"}`}
              />
            ) : null}
            {detail.admission.priceFrom !== null ||
            detail.admission.priceTo !== null ? (
              <TourismInfoRow
                label="Precio"
                value={formatAdmissionPrice(
                  detail.admission.priceFrom,
                  detail.admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <PlaceEmptyState text="No hay información de ingreso registrada." />
        )}
      </TourismSection>
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
      <TourismSection icon="mapPinned" title="Fotos" variant="divided">
        <PlaceEmptyState text="Todavía no hay imágenes publicadas para este centro." />
      </TourismSection>
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
    <TourismSection icon={icon} title={title} variant="divided">
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
    </TourismSection>
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
  fullScreenSearchOverlay: {
    bottom: 0,
    left: 0,
    paddingHorizontal: turismoSpacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 50,
  },
  fullScreenSearchHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  searchBackAction: {
    height: turismoMetrics.touchTarget,
    width: turismoMetrics.touchTarget,
  },
  searchSuggestionsPanel: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    elevation: 8,
    overflow: "hidden",
    shadowColor: turismoFixedColors.shadow,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  searchSuggestionsPanelFullScreen: {
    borderRadius: 0,
    borderWidth: 0,
    elevation: 0,
    flex: 1,
    shadowOpacity: 0,
  },
  searchSuggestionsScroll: { maxHeight: 300 },
  searchSuggestionsScrollFullScreen: { flex: 1, maxHeight: undefined },
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
  centerSheetContent: {
    paddingBottom: turismoSpacing.xxl + turismoMetrics.iconButtonLg,
    paddingTop: 0,
  },
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
  ratingPressed: { opacity: turismoOpacity.pressed },
  actions: { flexDirection: "row", gap: turismoSpacing.xs },
  routeAction: { flex: 1 },
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
