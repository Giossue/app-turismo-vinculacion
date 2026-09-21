import ExpoBottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
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
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  Image,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Defs, LinearGradient, Rect, Stop, Svg } from "react-native-svg";
import { Redirect, Stack, useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  TourismActionButton,
  TourismCompassAction,
  TourismChoiceChip,
  TourismIconAction,
  TourismSearchField,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
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
import { useDiscoveryCatalog } from "@/features/centers/application/use-discovery-catalog";
import { usePublishedCenters } from "@/features/centers/application/use-published-centers";
import { useMapEstablishments } from "@/features/establishments/application/use-map-establishments";
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
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import {
  useSavedCenterMutation,
  useSavedCenters,
} from "@/features/favorites/application/use-saved-centers";
import { useCenterOpinions } from "@/features/opinions/application/use-center-opinions";
import { CenterOpinions } from "@/features/opinions/presentation/center-opinions";
import { CenterMap } from "@/features/map/presentation/center-map";
import { MapAttributionButton } from "@/features/map/presentation/map-attribution-button";
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
  const colors = useTurismoPalette();
  const auth = useAuth();
  const { closeMenu, menuVisible, openMenu } = useTourismMenu();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const sheetRef = useRef<ExpoBottomSheet>(null);
  const agentSheetRef = useRef<ExpoBottomSheet>(null);
  const searchSheetOpenRef = useRef(false);
  const preserveSelectionOnSearchCloseRef = useRef(false);
  const agentSheetOpenRef = useRef(false);
  const mapAttributionHandlerRef = useRef<(() => void) | null>(null);
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [searchMode, setSearchMode] = useState<ExploreSearchMode>("CENTERS");
  const [searchFocused, setSearchFocused] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [resetNorthKey, setResetNorthKey] = useState(0);
  const [selectedCenterCode, setSelectedCenterCode] = useState<string | null>(
    null,
  );
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<PublicMapEstablishment | null>(null);
  const [selectedCenterExpanded, setSelectedCenterExpanded] = useState(false);
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
    setSelectedCenterExpanded(false);
    dismissSearchSheet();
  }, [dismissSearchSheet]);
  const closeSelectedCenter = useCallback(() => {
    setSelectedCenterExpanded(false);
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
  const expandSelectedCenter = useCallback(() => {
    setSelectedCenterExpanded(true);
  }, []);
  const selectCenter = useCallback(
    (center: PublicCenter) => {
      preserveSelectionOnSearchCloseRef.current = searchSheetOpenRef.current;
      dismissSearchSheet();
      setSelectedCenterExpanded(false);
      setSelectedEstablishment(null);
      setSelectedCenterCode(center.code);
    },
    [dismissSearchSheet],
  );
  const selectEstablishment = useCallback(
    (establishment: PublicMapEstablishment) => {
      preserveSelectionOnSearchCloseRef.current = searchSheetOpenRef.current;
      dismissSearchSheet();
      setSelectedCenterCode(null);
      setSelectedCenterExpanded(false);
      setSelectedEstablishment(establishment);
    },
    [dismissSearchSheet],
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
    setSelectedCenterExpanded(false);
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
    await requestLocation();
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
    setSelectedCenterExpanded(false);
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

  const handleSubmitSearch = useCallback(() => {
    const nextQuery = text.trim();
    if (nextQuery.length < 2) return;
    setSubmittedText(nextQuery);
    setSearchFocused(false);
    setNearbyOnly(false);
    setSelectedCenterCode(null);
    setSelectedEstablishment(null);
  }, [text]);

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
        onAttributionChange={handleAttributionChange}
        onBearingChange={setMapBearing}
        onCenterPress={(center) => {
          selectCenter(center);
        }}
        onEstablishmentPress={selectEstablishment}
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
                onClear={clearSearch}
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
              />
            </>
          ) : null}
          {searchMode === "CENTERS" && isFetching ? (
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
      {!selectedCenterCode && !selectedEstablishment ? (
        <ExpoBottomSheet
          backgroundStyle={{ backgroundColor: colors.surface }}
          enablePanDownToClose
          handleComponent={null}
          index={-1}
          onClose={() => {
            const preserveSelection = preserveSelectionOnSearchCloseRef.current;
            preserveSelectionOnSearchCloseRef.current = false;
            searchSheetOpenRef.current = false;
            if (!preserveSelection) clearSearch();
          }}
          ref={sheetRef}
          snapPoints={["38%", "84%"]}
        >
          {submittedQuery && searchMode === "CENTERS" ? (
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
                centers={visibleCenters}
                error={error ?? null}
                filters={filters}
                isFetching={isFetching}
                isPlaceholderData={isPlaceholderData}
                nearbyOnly={nearbyOnly}
                onChangeFilters={setFilters}
                onClear={clearSearch}
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
            >
              <EstablishmentResultsSheet
                data={nearbyEstablishments.data}
                error={nearbyEstablishments.error as Error | null}
                hasLocation={Boolean(userLocation)}
                isFetching={nearbyEstablishments.isFetching}
                onClear={clearSearch}
                onRequestLocation={() => void handleLocateUser()}
                onRetry={() => void nearbyEstablishments.refetch()}
                query={submittedQuery}
              />
            </BottomSheetScrollView>
          ) : null}
        </ExpoBottomSheet>
      ) : null}
      {selectedCenter ? (
        <CenterDetailSheet
          center={selectedCenter}
          detail={selectedCenterDetail}
          detailError={selectedCenterDetailError}
          detailPending={isSelectedCenterDetailPending}
          expanded={selectedCenterExpanded}
          isLandscape={isLandscape}
          onClose={closeSelectedCenter}
          onExpand={expandSelectedCenter}
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
      <ExpoBottomSheet
        backgroundStyle={{ backgroundColor: colors.surface }}
        enablePanDownToClose={false}
        handleComponent={null}
        index={-1}
        onClose={() => {
          agentSheetOpenRef.current = false;
          setAgentOpen(false);
        }}
        ref={agentSheetRef}
        snapPoints={["100%"]}
      >
        <BottomSheetView style={styles.agentSheetView}>
          <AgentChatContent
            onClose={closeAgent}
            onOpenCenter={openAgentCenter}
          />
        </BottomSheetView>
      </ExpoBottomSheet>
    </View>
  );
}

const CENTER_SHEET_SPRING = {
  damping: 30,
  mass: 0.8,
  overshootClamping: true,
  stiffness: 280,
} as const;
const CENTER_SHEET_EXPAND_THRESHOLD = 0.34;
const CENTER_SHEET_DISMISS_DISTANCE = 96;
const CENTER_SHEET_DISMISS_VELOCITY = 700;

function CenterDetailSheet({
  center,
  detail,
  detailError,
  detailPending,
  expanded,
  isLandscape,
  onClose,
  onExpand,
  onOpenRoute,
  onRequireAuth,
  onRetryDetail,
}: Readonly<{
  center: PublicCenter;
  detail?: PublicCenterDetail;
  detailError: Error | null;
  detailPending: boolean;
  expanded: boolean;
  isLandscape: boolean;
  onClose: () => void;
  onExpand: () => void;
  onOpenRoute: () => void;
  onRequireAuth: () => void;
  onRetryDetail: () => void;
}>) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fullOffset = Math.max(0, insets.top);
  const compactHeight = Math.min(
    Math.max(height * 0.52, 420),
    Math.max(360, height - fullOffset - 24),
  );
  const compactOffset = Math.max(fullOffset, height - compactHeight);
  const sheetOffset = useSharedValue(expanded ? fullOffset : compactOffset);
  const sheetEntryOffset = useSharedValue(
    expanded ? height - fullOffset : height - compactOffset,
  );
  const scrimOpacity = useSharedValue(0);
  const dragStartOffset = useSharedValue(compactOffset);

  useEffect(() => {
    sheetEntryOffset.value = withSpring(0, CENTER_SHEET_SPRING);
    scrimOpacity.value = withTiming(1, { duration: 220 });
  }, [
    compactOffset,
    expanded,
    fullOffset,
    height,
    scrimOpacity,
    sheetEntryOffset,
  ]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .enabled(!expanded)
    .onBegin(() => {
      dragStartOffset.value = sheetOffset.value;
    })
    .onUpdate((event) => {
      const next = dragStartOffset.value + event.translationY;
      sheetOffset.value = Math.max(fullOffset, Math.min(height, next));
    })
    .onEnd((event) => {
      const dismissByDistance =
        sheetOffset.value - compactOffset >= CENTER_SHEET_DISMISS_DISTANCE;
      const dismissByVelocity =
        event.velocityY >= CENTER_SHEET_DISMISS_VELOCITY;
      if (dismissByDistance || dismissByVelocity) {
        sheetOffset.value = withSpring(
          height,
          {
            damping: 32,
            mass: 0.8,
            overshootClamping: true,
            stiffness: 260,
          },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
        return;
      }
      const travel = compactOffset - fullOffset;
      const progress =
        travel <= 0 ? 1 : (compactOffset - sheetOffset.value) / travel;
      const shouldExpand =
        progress >= CENTER_SHEET_EXPAND_THRESHOLD || event.velocityY < -650;
      sheetOffset.value = withSpring(
        shouldExpand ? fullOffset : compactOffset,
        CENTER_SHEET_SPRING,
      );
      if (shouldExpand) runOnJS(onExpand)();
    });
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.value + sheetEntryOffset.value }],
  }));
  const scrimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  return (
    <View pointerEvents="box-none" style={styles.centerSheetOverlay}>
      <Animated.View
        pointerEvents={expanded ? "none" : "auto"}
        style={[
          styles.centerSheetScrim,
          { backgroundColor: colors.scrim },
          scrimAnimatedStyle,
        ]}
      >
        <Pressable
          accessibilityLabel="Cerrar ficha turística"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.centerSheetSurface,
            isLandscape && styles.centerSheetSurfaceLandscape,
            { backgroundColor: colors.surface },
            sheetAnimatedStyle,
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              styles.sheetView,
              styles.centerSheetContent,
              isLandscape && styles.sheetViewLandscape,
            ]}
            key={center.code}
            scrollEnabled={expanded}
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
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
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
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<PlaceTab>>(
    () => new Set<PlaceTab>(["information"]),
  );
  const heroPhoto = detail?.photos[0];
  const location =
    detail?.address ?? detail?.touristZone ?? "Ubicación no registrada";
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
            accessibilityLabel="Cerrar ficha turística"
            icon="close"
            onPress={onClose}
          />
        </View>
      </View>
      <View style={styles.placeActions}>
        <Pressable
          accessibilityLabel="Compartir ficha turística"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() =>
            void Share.share({
              message: `${center.name} · ${location}`,
            })
          }
          style={({ pressed }) => [
            styles.placeAction,
            pressed && styles.placeActionPressed,
          ]}
        >
          <TurismoIcon
            color={colors.text}
            name="share"
            size={turismoIconSizes.md}
          />
        </Pressable>
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
            name="bookmark"
            size={turismoIconSizes.md}
          />
        </Pressable>
      </View>
      <Text style={[styles.placeTitle, { color: colors.text }]}>
        {center.name}
      </Text>
      <CenterRatingSummary
        onPress={() => changeTab("opinions")}
        summary={opinions.data?.summary}
      />
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
            style={styles.placePagerViewport}
          >
            <ScrollView
              horizontal
              nestedScrollEnabled
              onMomentumScrollEnd={handlePagerEnd}
              pagingEnabled
              ref={pagerRef}
              showsHorizontalScrollIndicator={false}
            >
              <View style={[styles.placePage, { width: pagerWidth || "100%" }]}>
                {visitedTabs.has("information") ? (
                  <PlaceInformation detail={detail} />
                ) : null}
              </View>
              <View style={[styles.placePage, { width: pagerWidth || "100%" }]}>
                {visitedTabs.has("opinions") ? (
                  <PlaceOpinions
                    active={activeTab === "opinions"}
                    code={code}
                    onRequireAuth={onRequireAuth}
                  />
                ) : null}
              </View>
              <View style={[styles.placePage, { width: pagerWidth || "100%" }]}>
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
  onPress,
  summary,
}: Readonly<{
  onPress: () => void;
  summary?: OpinionRatingSummary;
}>) {
  const colors = useTurismoPalette();
  if (!summary || summary.averageRating === null || summary.total === 0) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={`${formatRating(summary.averageRating)} de 5 estrellas, ${summary.total} opiniones`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingSummary,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && styles.ratingPressed,
      ]}
    >
      <TurismoIcon color={colors.warm} name="star" size={turismoIconSizes.sm} />
      <Text style={[styles.ratingValue, { color: colors.text }]}>
        {formatRating(summary.averageRating)}
      </Text>
      <Text style={[styles.ratingCount, { color: colors.textMuted }]}> 
        ({summary.total} opiniones)
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
            <View key={value} style={styles.detailBulletRow}>
              <Text
                style={[styles.detailBullet, { color: colors.primaryStrong }]}
              >
                •
              </Text>
              <Text style={[styles.detailBulletText, { color: colors.text }]}>
                {value}
              </Text>
            </View>
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
    padding: turismoSpacing.lg,
    width: "100%",
  },
  sheetViewLandscape: { maxWidth: turismoMetrics.sheetMaxWidth },
  centerSheetOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 30,
  },
  centerSheetScrim: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  centerSheetSurface: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    bottom: 0,
    elevation: 24,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  centerSheetSurfaceLandscape: {
    alignSelf: "center",
    maxWidth: turismoMetrics.sheetMaxWidth,
    width: "100%",
  },
  centerSheetContent: {
    paddingBottom: turismoSpacing.xxl + turismoMetrics.iconButtonLg,
  },
  centerSheetScroll: { flex: 1 },
  agentSheetView: {
    flex: 1,
    minHeight: 360,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
  placeSheet: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xl },
  placeHero: {
    aspectRatio: 1.35,
    alignSelf: "stretch",
    marginHorizontal: -turismoSpacing.lg,
    marginTop: -turismoSpacing.lg,
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
    position: "absolute",
    right: turismoSpacing.xxl,
    top: turismoSpacing.md,
    zIndex: 2,
  },
  placeActions: {
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
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.sm,
  },
  ratingValue: { ...turismoTypography.heading },
  ratingCount: { ...turismoTypography.body },
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
  placePagerViewport: { width: "100%" },
  placePage: { gap: turismoSpacing.md },
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
    paddingBottom: turismoSpacing.lg,
    paddingTop: turismoSpacing.md,
  },
  detailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  detailSectionTitle: { ...turismoTypography.heading },
  detailSectionContent: { gap: turismoSpacing.sm },
  detailInfoRow: { gap: turismoSpacing.xxs },
  detailInfoLabel: { ...turismoTypography.caption },
  detailInfoValue: { ...turismoTypography.body },
  detailBulletList: {
    gap: turismoSpacing.xs,
  },
  detailBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  detailBullet: { ...turismoTypography.body, lineHeight: 20 },
  detailBulletText: { ...turismoTypography.body, flex: 1 },
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
